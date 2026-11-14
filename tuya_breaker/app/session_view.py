"""Summarize the existing session output without changing any engine or input."""
import re
import time

from journal import Journal
from ota_progress import TransferProgress

OPTION = re.compile(r"\[(\d{1,5})\] ([A-Za-z0-9][A-Za-z0-9_.-]{0,123})")
PROMPT = re.compile(r"Enter choice \[\d{1,5}-\d{1,5}\]: ")
SIZE = re.compile(r"\s*['\x22]otaFileLen['\x22]: (\d{1,8}),?")
CHUNK = re.compile(r"Sending OTA package: 0x([0-9A-Fa-f]{1,8}), length (\d{1,8})")
BACKUP = re.compile(r"\[Lightleak\] Backup \d{1,3}% · (\d{1,8})/2097152 bytes")
AP = re.compile(r"Found open network: (SmartLife-[0-9A-Fa-f]{4,12})")
SIGNAL = re.compile(r"(?:\s*signal:\s*|\[Wi-Fi\] Selected open AP: .*; signal=)(-?\d{1,3}(?:\.\d+)?) dBm")
ASSOC = re.compile(r"\[Wi-Fi\] Association (\d{1,3})/(\d{1,3}): state=([A-Z_]{1,24});.*")
FIRMWARE = re.compile(r"Select firmware for ([A-Za-z0-9_-]{1,24}):")
SOFTWARE = re.compile(r"\s*['\x22]softVer['\x22]: ['\x22]([\d.]{1,24})['\x22],?")


class SessionView:
    """A bounded projection of PTY output. Report only the fields the UI uses."""

    def __init__(self, tool, adapter=None):
        self.adapter = adapter
        self.started = time.monotonic()
        self.elapsed = None
        self.tool = tool
        self.phase = "prepare"
        self.outcome = None
        self.pending = ""
        self.menu_title = None
        self.menu_options = []
        self.prompt = None
        self.platform = None
        self.firmware = None
        self.ap = None
        self.signal = None
        self.association = None
        self.connected = False
        self.software = None
        self.transfer = None
        self.transfer_reported_sent = False
        self.transfer_confirmed = False
        self.radio_returned = False
        self.backup = None

    def feed(self, chunk):
        lines = (self.pending + chunk).split("\n")
        for line in lines[:-1]:
            self.line(line)
        self.pending = lines[-1][-512:]
        self.detect_prompt(self.pending)

    def detect_prompt(self, line):
        # PTY prompts can arrive without a newline. Echoed choices and unrelated
        # lines are handled separately so polling never consumes the prompt.
        if not PROMPT.match(line):
            return
        if self.menu_title and self.menu_options:
            self.prompt = {"title": self.menu_title, "choices": self.menu_options.copy()}
        else:
            self.prompt = {"title": None, "choices": []}

    def line(self, line):
        if match := PROMPT.match(line):
            self.detect_prompt(line)
            if line[match.end():].strip().isdigit():
                self.choice(line[match.end():].strip())
            return
        line = line.strip()
        if self.prompt and line.isdigit():
            self.choice(line)
            return
        if self.tool == "untuyaos3":
            self.untuya_line(line)
        elif self.tool == "lightleak":
            if line.startswith(("[Lightleak] Scanning for ", "[Lightleak] Connecting only to ")):
                self.phase = "connect"
            elif line.startswith("[Lightleak] Payload response verified "):
                self.phase = "work"
            elif match := BACKUP.fullmatch(line):
                count = int(match[1])
                if count <= 2097152:
                    self.phase = "transfer"
                    self.backup = max(self.backup or 0, count)
        elif self.tool == "cloudcutter":
            if line.startswith(("Scanning for the target AP;", "Connecting only to selected AP ")):
                self.phase = "connect"
            elif line.startswith(("Verified device endpoint:", "Device must now join the private cloudcutterflash AP.")):
                self.phase = "work"

    def choice(self, number):
        if self.prompt and self.menu_title == "Select firmware":
            self.firmware = next((item["label"] for item in self.menu_options if item["number"] == number), None)
        self.prompt = None

    def untuya_line(self, line):
        if line == "Select target platform:":
            self.menu_title, self.menu_options = "Select platform", []
        elif match := FIRMWARE.fullmatch(line):
            self.platform = match[1]
            self.menu_title, self.menu_options = "Select firmware", []
        elif self.menu_title and (match := OPTION.fullmatch(line)) and len(self.menu_options) < 80:
            self.menu_options.append({"number": match[1], "label": match[2]})
        elif line.startswith(("===== UnTuyaOS3: connect.sh", "Scanning on ")):
            self.phase = "connect"
            self.prompt, self.menu_title, self.menu_options = None, None, []
        elif match := AP.fullmatch(line):
            self.ap = match[1]
        elif match := SIGNAL.fullmatch(line):
            self.signal = float(match[1])
        elif match := ASSOC.fullmatch(line):
            self.association = {"attempt": int(match[1]), "limit": int(match[2]), "state": match[3]}
        elif line.startswith("DHCP bound:"):
            self.connected = True
        elif line.startswith("===== UnTuyaOS3: ap-ota.py"):
            self.phase = "work"
        elif self.phase == "work" and (match := SOFTWARE.fullmatch(line)):
            self.software = match[1]
        elif self.transfer is None and self.phase == "work" and (match := SIZE.fullmatch(line)):
            total = int(match[1])
            if 0 < total <= 32 * 1024 * 1024:
                self.transfer = TransferProgress(total)
                self.phase = "transfer"
        elif self.transfer and (match := CHUNK.fullmatch(line)):
            offset, length = int(match[1], 16), int(match[2])
            if length and offset + length <= self.transfer.total and len(self.transfer.ranges) < 1024:
                self.transfer.record(offset, length)
        elif self.transfer and line == "Reported OTA finished!":
            self.transfer_confirmed = True
        elif self.transfer and line.startswith("All firmware bytes were sent, but OTA completion was not confirmed"):
            self.transfer_reported_sent = True

    def snapshot(self):
        transfer = None
        if self.transfer:
            sent = self.transfer_reported_sent or self.transfer_confirmed
            count = self.transfer.total if sent else sum(end - start for start, end in self.transfer.ranges)
            transfer = {"kind": "ota", "bytes": count, "total": self.transfer.total, "sent": sent,
                        "confirmed": self.transfer_confirmed}
        elif self.backup is not None:
            transfer = {"kind": "backup", "bytes": self.backup, "total": 2097152}
        return {"tool": self.tool, "phase": self.phase, "prompt": self.prompt, "outcome": self.outcome,
                "platform": self.platform, "firmware": self.firmware, "ap": self.ap, "signal": self.signal,
                "association": self.association, "connected": self.connected, "software": self.software,
                "transfer": transfer, "radio_returned": self.radio_returned, "adapter": self.adapter,
                "elapsed": self.elapsed if self.elapsed is not None else int(time.monotonic() - self.started)}


class BreakerJournal(Journal):
    """Keep current session status independent of the log cursor and retention."""

    def __init__(self, data):
        super().__init__(data)
        self.session = None

    def begin_session(self, tool, adapter):
        with self.lock:
            self.session = SessionView(tool, adapter)

    def finish_session(self, outcome):
        with self.lock:
            if self.session:
                self.session.outcome = outcome
                self.session.prompt = None
                self.session.elapsed = int(time.monotonic() - self.session.started)

    def emit(self, level, text, channel="diagnostic"):
        with self.lock:
            if self.session and self.session.outcome is None:
                if channel == "terminal":
                    self.session.feed(text)
                elif channel == "diagnostic" and text == "Adapter returned and original host settings restored; selection unlocked":
                    self.session.radio_returned = True
            super().emit(level, text, channel)

    def snapshot(self, after, generation=None):
        with self.lock:
            data = super().snapshot(after, generation)
            data["session_view"] = self.session.snapshot() if self.session else None
            return data
