"use strict";

const previousSessionStatus = window.onSessionStatus;
const sessionToolNames = {untuyaos3: "UnTuyaOS3", lightleak: "Lightleak", cloudcutter: "Tuya-Cloudcutter"};
const sessionNumbers = new Intl.NumberFormat();
let renderedSessionFacts = "", renderedSessionMenu = "", fallbackPromptOpen = false;
const sessionStages = [...$("session-stages").children];
const sessionPhaseIndex = {prepare: 0, connect: 1, work: 2, transfer: 2};

function sessionText(id, value) {
  if ($(id).textContent !== value) $(id).textContent = value;
}

function renderSessionFacts(view, adapter) {
  const association = view.association;
  const fields = [
    ["Adapter", adapter],
    ["Platform", view.platform],
    ["Firmware", view.firmware],
    ["Device software", view.software],
    ["Device Wi-Fi", view.ap],
    ["Signal", Number.isFinite(view.signal) ? view.signal + " dBm" : null],
    ["Wi-Fi status", view.connected ? "Address assigned" :
      association ? association.state.replaceAll("_", " ") + " · " + association.attempt + "/" + association.limit : null]
  ].filter(([, value]) => value);
  const key = JSON.stringify(fields);
  if (key === renderedSessionFacts) return;
  renderedSessionFacts = key;
  $("session-facts").replaceChildren(...fields.map(([label, value]) => {
    const row = document.createElement("div");
    const name = document.createElement("dt");
    const detail = document.createElement("dd");
    name.textContent = label;
    detail.textContent = value;
    if (label === "Firmware") row.className = "session-firmware";
    row.append(name, detail);
    return row;
  }));
}

function renderSessionMenu(prompt) {
  const choices = prompt?.choices || [];
  const visible = Boolean(choices.length && running);
  $("session-menu").hidden = !visible;
  const key = JSON.stringify(visible ? prompt : null);
  if (key !== renderedSessionMenu) {
    if (visible) $("choice").value = "";
    renderedSessionMenu = key;
    sessionText("session-menu-title", prompt?.title || "Menu options");
    $("session-menu-options").replaceChildren(...(visible ? choices : []).map(({number, label}) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.textContent = number + " · " + label;
      button.onclick = () => {
        $("choice").value = number;
        renderSessionMenu(prompt);
        $("send").focus();
      };
      button.dataset.choice = number;
      return button;
    }));
  }
  for (const button of $("session-menu-options").children) {
    button.disabled = !running || inputPending;
    button.setAttribute("aria-pressed", String($("choice").value === button.dataset.choice));
  }
}

window.onSessionStatus = (state, data) => {
  previousSessionStatus?.(state, data);
  const report = data.session_view;
  const busy = ["assigning", "running", "cleaning", "releasing"].includes(state);
  const view = report && state !== "assigning" && report.tool === data.tool && !(busy && report.outcome) ? report : null;
  $("session-overview").hidden = !view && !busy;
  renderSessionMenu(view?.prompt);
  if (!view && !busy) {
    fallbackPromptOpen = false;
    return;
  }
  const tool = sessionToolNames[data.tool] || "Session";
  const elapsed = view?.elapsed;
  const time = Number.isInteger(elapsed) ? " · " + Math.floor(elapsed / 60) + ":" + String(elapsed % 60).padStart(2, "0") : "";
  sessionText("session-tool", tool + time);
  const sessionState = !busy && state === "ready" ? (view?.outcome || state) : state;
  const final = ["finished", "unconfirmed", "failed", "cancelled"].includes(sessionState);
  const badges = {assigning: "Assigning adapter", running: "In progress", cleaning: "Cleaning up",
    releasing: "Returning adapter", finished: "Finished", unconfirmed: "Unconfirmed", failed: "Failed", cancelled: "Stopped"};
  sessionText("session-result", data.recovery_pending ? "Recovery pending" : (badges[sessionState] || "Last session"));
  $("session-result").className = "badge " + (data.recovery_pending ? "unconfirmed" : sessionState);
  const phase = view?.phase || "prepare";
  const reached = sessionPhaseIndex[phase] ?? 0;
  const stage = ["cleaning", "releasing"].includes(state) || final ? 3 : reached;
  const operationCompleted = sessionState === "finished" && reached === 2;
  const radioReturned = final && view?.radio_returned && !data.recovery_pending;
  for (const [index, node] of sessionStages.entries()) {
    node.dataset.done = String(index < reached || (index === 2 && operationCompleted) || (index === 3 && radioReturned));
    if (!final && index === stage) node.setAttribute("aria-current", "step");
    else node.removeAttribute("aria-current");
  }
  const transfer = view?.transfer;
  const detail = {
    assigning: "Reserving the selected Wi-Fi adapter.",
    cleaning: "Stopping services and cleaning up the isolated Wi-Fi adapter.",
    releasing: "Returning the adapter to Home Assistant.",
    finished: transfer?.confirmed ? "The device confirmed the transfer. Verify that it boots and works."
      : transfer?.kind === "backup" ? "Flash backup saved. Open the Lightleak tab to download it."
      : "The session finished. Check the device and diagnostics for the result.",
    unconfirmed: transfer?.sent ? "All firmware bytes were sent. The device did not confirm completion. Check for Kickstart Wi-Fi and verify boot before retrying."
      : "Completion is unconfirmed. Review diagnostics and check the device before retrying.",
    failed: "The session ended with an error. Open the session console or diagnostics for details.",
    cancelled: "The session was stopped. Check the device and diagnostics before starting again."
  };
  const active = {prepare: "Preparing the session.", connect: view?.connected
    ? "Device Wi-Fi connected and address assigned." : "Looking for the device and establishing a Wi-Fi connection.",
    work: "Communicating with the device.", transfer: transfer?.kind === "backup"
      ? "Reading the device flash backup." : transfer?.bytes === transfer?.total
      ? "All firmware blocks were reported. Waiting for the device to confirm completion."
      : "Transferring firmware."};
  const promptMessage = view?.prompt?.choices.length ? "Choose an option below and submit it."
    : "The session needs input. Read the prompt in the session console.";
  const menuFallback = running && !view?.prompt?.choices.length;
  sessionText("session-detail", data.recovery_pending ? "The adapter still needs recovery. Review diagnostics."
    : detail[sessionState] || (view?.prompt ? promptMessage : active[phase]));
  renderSessionFacts(view || {}, view?.adapter || (busy ? data.adapter?.name || data.selected_adapter : null));
  $("session-transfer").hidden = !transfer;
  if (transfer) {
    const percent = Math.floor(100 * transfer.bytes / transfer.total);
    $("session-meter").value = percent;
    sessionText("session-percent", percent + "%");
    sessionText("session-meter-label", transfer.kind === "backup" ? "Flash backup"
      : transfer.sent ? "Firmware sent" : "Firmware blocks reported");
    sessionText("session-bytes", sessionNumbers.format(transfer.bytes) + " / " +
      sessionNumbers.format(transfer.total) + " bytes");
  }
  const fallback = Boolean(menuFallback && (view?.prompt || data.tool !== "untuyaos3"));
  if (fallback && !fallbackPromptOpen) $("session-console").open = true;
  fallbackPromptOpen = fallback;
};
