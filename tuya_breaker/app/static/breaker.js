"use strict";
const DEFAULT_ACCENT = "#7ac7ff", ACCENT_STORAGE = "tuya-breaker-accent-v1";
function applyAccent(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) value = DEFAULT_ACCENT;
  const channels = [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset+2), 16)/255);
  const linear = channels.map((c) => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
  const luminance = linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
  const root = document.documentElement;
  const highlight = luminance >= .3 ? value : "#" + channels.map((c) => Math.round((.55+c*.45)*255).toString(16).padStart(2,"0")).join("");
  root.style.setProperty("--cyan", highlight);
  root.style.setProperty("--accent-fill", value);
  root.style.setProperty("--button-text", luminance > .179 ? "#09131d" : "#ffffff");
  $("accent-colour").value = value;
  $("accent-value").textContent = value.toUpperCase();
  try { localStorage.setItem(ACCENT_STORAGE, value); } catch (_) { /* Ingress may restrict storage. */ }
}
let savedAccent = DEFAULT_ACCENT;
try { savedAccent = localStorage.getItem(ACCENT_STORAGE) || DEFAULT_ACCENT; } catch (_) {}
applyAccent(savedAccent);
$("accent-colour").oninput = () => applyAccent($("accent-colour").value);
$("accent-reset").onclick = () => applyAccent(DEFAULT_ACCENT);
let ccDevicePage = 0, ccBusy = false;
let breakerDevices = [], breakerProfiles = [], breakerFirmware = {}, breakerDirty = true, breakerPending = false;
const ccFields = ["cc-change-device","cc-brand", "cc-device-prev", "cc-device-next","cc-search", "cc-device", "cc-profile", "cc-method", "cc-firmware", "cc-ssid", "cc-password", "cc-save", "cc-load", "cc-refresh"];
window.onSessionStatus = (state, data) => {
  const tool = data.tool || "untuyaos3";
  const busy = ["running", "assigning", "cleaning", "releasing", "offline"].includes(state)
    || Boolean(data.adapter_busy || data.selection_locked || breakerPending || startPending);
  for (const name of ["untuyaos3", "lightleak", "cloudcutter"]) {
    const button = $("tool-" + name);
    button.disabled = busy;
    button.setAttribute("aria-pressed", String(tool === name));
    button.classList.toggle("secondary", tool !== name);
  }
  $("cloudcutter-settings").hidden = tool !== "cloudcutter";
  $("tool-description").textContent = tool === "cloudcutter"
    ? "CloudCutter: select the exact original firmware profile, then flash or detach."
    : tool === "lightleak" ? "Lightleak: review a generic chip variant, install its payload and download a private flash backup."
    : "UnTuyaOS3: use the established platform and firmware menus.";
  ccBusy = busy;
  for (const id of ccFields) $(id).disabled = busy;
  for (const button of document.querySelectorAll(".cc-card button")) button.disabled = busy;
  updateCcPagination();
  if (tool === "cloudcutter" && (breakerDirty || breakerPending || !data.engine_ready)) {
    $("start").disabled = true;
    $("start-help").textContent = "Review and use the CloudCutter configuration above before starting.";
  }
  const review = data.cloudcutter_review;
  $("cc-review").textContent = review
    ? (!data.engine_ready ? "Review required for a new attempt. Last selection: " : breakerDirty ? "Unsaved changes. Previously reviewed: " : "Reviewed: ")
      + [review.device, review.profile, review.chip, review.method, review.firmware].filter(Boolean).join(" · ")
    : "No CloudCutter configuration reviewed yet.";
};
function breakerControls() { controls(currentState, currentStatus); }
function dirtyBreaker() { breakerDirty = true; $("risk-ack").checked = false; breakerControls(); }
async function breakerRequest(path, data = {}) {
  if (breakerPending) throw new Error("Wait for the current configuration operation.");
  breakerPending = true; breakerControls();
  try { return await api(path, data); }
  finally { breakerPending = false; breakerControls(); }
}
for (const tool of ["untuyaos3", "lightleak", "cloudcutter"]) {
  $("tool-" + tool).onclick = async () => {
    if ($("tool-" + tool).disabled) return;
    $("risk-ack").checked = false;
    try { await breakerRequest("api/tool", {tool}); await poll(); }
    catch (error) { notice(error.message, true); }
  };
}
function ccMatches() {
  const query = $("cc-search").value.toLowerCase().trim(), brand = $("cc-brand").value;
  return breakerDevices.filter((d) => (!brand || d.manufacturer === brand)
    && (d.manufacturer + " " + d.name).toLowerCase().includes(query));
}
function renderBrands() {
  const selected = $("cc-brand").value;
  $("cc-brand").replaceChildren(new Option("All brands", ""));
  for (const brand of [...new Set(breakerDevices.map((d) => d.manufacturer))].sort()) $("cc-brand").append(new Option(brand, brand));
  $("cc-brand").value = selected;
}
function updateCcPagination() {
  const count = ccMatches().length;
  $("cc-device-prev").disabled = ccBusy || ccDevicePage === 0;
  $("cc-device-next").disabled = ccBusy || (ccDevicePage + 1)*6 >= count;
}
function ccCard(title, subtitle, detail, action, selected, choose) {
  const card = document.createElement("article"); card.className = "cc-card";
  if (selected) card.classList.add("selected");
  const eyebrow = document.createElement("span"); eyebrow.className = "eyebrow"; eyebrow.textContent = subtitle;
  const heading = document.createElement("h4"); heading.textContent = title;
  const metadata = document.createElement("p"); metadata.className = "hint"; metadata.textContent = detail;
  const button = document.createElement("button"); button.type = "button"; button.className = "secondary";
  button.textContent = action; button.setAttribute("aria-pressed", String(selected)); button.disabled = ccBusy;
  button.onclick = choose; card.append(eyebrow, heading, metadata, button); return card;
}
function renderCatalogue() {
  const selected = $("cc-device").value, matches = ccMatches();
  ccDevicePage = Math.min(ccDevicePage, Math.max(0, Math.ceil(matches.length/6)-1));
  $("cc-device").replaceChildren(new Option("Choose exact device and original firmware…", ""));
  for (const device of matches.slice(0,200)) $("cc-device").append(new Option(device.manufacturer + " · " + device.name, device.slug));
  const previous = breakerDevices.find((d) => d.slug === selected);
  if (previous && !matches.slice(0,200).some((d) => d.slug === selected)) $("cc-device").append(new Option(previous.manufacturer + " · " + previous.name, previous.slug));
  if (previous) $("cc-device").value = selected;
  $("cc-device-count").textContent = matches.length + " matching device/firmware entries · six per page";
  $("cc-device-page").textContent = matches.length ? (ccDevicePage+1) + " / " + Math.ceil(matches.length/6) : "0 / 0";
  const cards = $("cc-device-cards"); cards.replaceChildren();
  for (const device of matches.slice(ccDevicePage*6, (ccDevicePage+1)*6)) {
    cards.append(ccCard(device.name, device.manufacturer, "Check the exact model and stock firmware before selecting.",
      device.slug === selected ? "Reload profiles" : "Load matching profiles", device.slug === selected, async () => {
        try {
          if (![...$("cc-device").options].some((option) => option.value === device.slug)) $("cc-device").append(new Option(device.name,device.slug));
          $("cc-device").value = device.slug; $("cc-device").onchange(); await loadCcProfiles();
        } catch (error) { notice(error.message,true); }
      }));
  }
  if (!matches.length) cards.textContent = breakerDevices.length ? "No matching entries. Try another model or firmware version; do not substitute a similar device." : "Load the official device catalogue to begin.";
  $("cc-selected-device").textContent = previous ? "Selected device: " + previous.manufacturer + " · " + previous.name : "No device selected.";
  updateCcPagination();
}
function renderCcProfiles() {
  const cards = $("cc-profile-cards"); cards.replaceChildren();
  $("cc-profile-count").textContent = breakerProfiles.length ? breakerProfiles.length + " profile(s). Choose only the exact original firmware; none is selected automatically." : "No supported profile loaded. Choose an exact device above.";
  for (const profile of breakerProfiles) {
    const selected = $("cc-profile").value === profile.slug;
    cards.append(ccCard(profile.name, profile.firmware.chip.toUpperCase(),
      [profile.firmware.name, profile.firmware.sdk && "SDK " + profile.firmware.sdk].filter(Boolean).join(" · "),
      selected ? "Selected exact profile" : "Choose this exact profile", selected, () => {
        $("cc-profile").value = profile.slug; $("cc-profile").onchange(); renderCcProfiles();
      }));
  }
}
$("cc-search").oninput = () => { ccDevicePage=0; renderCatalogue(); };
$("cc-brand").onchange = () => { ccDevicePage=0; renderCatalogue(); };
$("cc-device-prev").onclick = () => { if (ccDevicePage>0) ccDevicePage--; renderCatalogue(); };
$("cc-device-next").onclick = () => { if ((ccDevicePage+1)*6<ccMatches().length) ccDevicePage++; renderCatalogue(); };
$("cc-device").onchange = () => {
  breakerProfiles = [];
  $("cc-profile").replaceChildren(new Option("Load profiles for this device…", ""));
  renderFirmware(); renderCcProfiles(); renderCatalogue(); dirtyBreaker();
};
$("cc-refresh").onclick = async () => {
  try {
    const result = await breakerRequest("api/cloudcutter/catalogue/refresh");
    breakerDevices = result.devices; renderBrands(); ccDevicePage=0; renderCatalogue();
    notice("Official device catalogue loaded. Search for your exact model and original firmware.");
  } catch (error) { notice(error.message, true); }
};
async function loadCcProfiles() {
  try {
    if (!$("cc-device").value) throw new Error("Choose a device first.");
    const result = await breakerRequest("api/cloudcutter/device", {device: $("cc-device").value});
    breakerProfiles = result.profiles;
    $("cc-profile").replaceChildren(new Option("Choose exact firmware profile…", ""));
    for (const profile of breakerProfiles) $("cc-profile").append(new Option(
      [profile.name, profile.firmware.name, profile.firmware.sdk].filter(Boolean).join(" · "), profile.slug));
    if (!breakerProfiles.length) notice("This device has no supported classic CloudCutter profile.", true);
    renderFirmware(); renderCcProfiles(); renderCatalogue(); dirtyBreaker();
    if (breakerProfiles.length) $("cc-device-picker").open = false;
  } catch (error) { notice(error.message, true); }
}
$("cc-load").onclick = loadCcProfiles;
$("cc-change-device").onclick = () => { $("cc-device-picker").open = true; $("cc-search").focus(); };
function renderFirmware() {
  const name = $("cc-firmware").value;
  const profile = breakerProfiles.find((p) => p.slug === $("cc-profile").value);
  const chip = profile && profile.firmware.chip.toUpperCase();
  const files = breakerFirmware[chip] || [];
  $("cc-firmware").replaceChildren(new Option(chip ? "Choose a " + chip + " image…" : "Select an exact profile first…", ""));
  for (const file of files) $("cc-firmware").append(new Option(file, file));
  if (files.includes(name)) $("cc-firmware").value = name;
}
window.onFirmwareLibrary = (files) => { breakerFirmware = files; renderFirmware(); };
$("cc-profile").onchange = () => { renderFirmware(); renderCcProfiles(); dirtyBreaker(); };
for (const id of ["cc-firmware", "cc-ssid", "cc-password"]) $(id).oninput = dirtyBreaker;
$("cc-method").onchange = () => {
  $("cc-flash-settings").hidden = $("cc-method").value !== "flash";
  $("cc-detach-settings").hidden = $("cc-method").value !== "detach";
  dirtyBreaker();
};
$("cc-form").onsubmit = async (event) => {
  event.preventDefault();
  if ($("cc-save").disabled) return;
  try {
    await breakerRequest("api/cloudcutter/configure", {device: $("cc-device").value, profile: $("cc-profile").value,
      method: $("cc-method").value, firmware: $("cc-firmware").value,
      ssid: $("cc-ssid").value, password: $("cc-password").value});
    breakerDirty = false;
    $("cc-configuration").open = false;
    $("cc-password").value = "";
    $("risk-ack").checked = false;
    await poll(); breakerControls();
    notice("CloudCutter configuration reviewed. Check it, acknowledge the flashing risk, then start.");
  } catch (error) { dirtyBreaker(); notice(error.message, true); }
};
// A browser reload requires reviewing the form again; no Wi-Fi secret is returned.
fetch("api/cloudcutter/catalogue").then((r) => r.ok ? r.json() : {devices: []})
  .then((data) => { breakerDevices = data.devices; renderBrands(); renderCatalogue(); }).catch(() => {});
fetch("api/firmware").then((r) => r.ok ? r.json() : {files: {}})
  .then((data) => window.onFirmwareLibrary(data.files)).catch(() => {});
breakerControls();
