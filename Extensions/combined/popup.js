import { config } from "./src/config";
import { activateZrxLicense, getZrxLicenseState } from "./src/zrx/license";
import { getZrxRatedHistory, zrxHistoryToCsv } from "./src/zrx/history";

const byId = (id) => document.getElementById(id);

function zrxOpen(url) {
  chrome.tabs.create({ url });
}

function zrxSetStatus(id, message, tone = "neutral") {
  const node = byId(id);
  node.textContent = message;
  node.dataset.tone = tone;
}

async function refreshZrxPopup() {
  const [license, history] = await Promise.all([getZrxLicenseState(), getZrxRatedHistory()]);
  byId("zrx-version").textContent = `v${chrome.runtime.getManifest().version}`;
  byId("zrx-rated-count").textContent = history.length.toLocaleString();
  byId("zrx-history-note").textContent = history.length
    ? `Latest: ${history[history.length - 1].title}`
    : "Rate a video on YouTube and it will appear here, stored only on this device.";

  const tier = byId("zrx-tier-badge");
  tier.textContent = license.valid ? "Pro active" : "Free";
  tier.classList.toggle("is-pro", license.valid);
  document.querySelectorAll(".zrx-pro-only").forEach((node) => {
    node.textContent = license.valid ? "On" : "Pro";
    node.classList.toggle("is-live", license.valid);
  });
  byId("zrx-export").disabled = !license.valid;
  byId("zrx-activate").textContent = license.valid ? "Active" : "Activate";
  byId("zrx-activate").disabled = license.valid;
  byId("zrx-license-key").disabled = license.valid;
  if (license.valid) zrxSetStatus("zrx-license-status", "Licence active. Lifetime and Pro grants are both accepted.", "success");
}

async function activateFromPopup() {
  const input = byId("zrx-license-key");
  const button = byId("zrx-activate");
  button.disabled = true;
  button.textContent = "Checking…";
  zrxSetStatus("zrx-license-status", "Contacting the licence server…");
  const result = await activateZrxLicense(input.value);
  if (result.valid === true) {
    input.value = "";
    await refreshZrxPopup();
    return;
  }
  button.disabled = false;
  button.textContent = "Activate";
  const message = result.error === "offline"
    ? "Could not reach the licence server. Check your connection and try again."
    : "That key was not accepted. Check all four groups and try again.";
  zrxSetStatus("zrx-license-status", message, "error");
}

async function exportZrxHistory() {
  const [license, rows] = await Promise.all([getZrxLicenseState(), getZrxRatedHistory()]);
  if (!license.valid) {
    zrxSetStatus("zrx-export-status", "CSV export is available with Pro.", "error");
    return;
  }
  if (!rows.length) {
    zrxSetStatus("zrx-export-status", "No rated videos yet.");
    return;
  }
  const blob = new Blob([zrxHistoryToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ratio-rated-history-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  zrxSetStatus("zrx-export-status", `Exported ${rows.length} ${rows.length === 1 ? "row" : "rows"}.`, "success");
}

function bindZrxSetting(id, key) {
  const checkbox = byId(id);
  chrome.storage.sync.get([key], (result) => {
    checkbox.checked = result[key] === true;
  });
  checkbox.addEventListener("change", () => chrome.storage.sync.set({ [key]: checkbox.checked }));
}

byId("zrx-activate").addEventListener("click", activateFromPopup);
byId("zrx-license-key").addEventListener("keydown", (event) => {
  if (event.key === "Enter") activateFromPopup();
});
byId("zrx-pricing").addEventListener("click", () => zrxOpen(config.links.pricing));
byId("zrx-source").addEventListener("click", (event) => { event.preventDefault(); zrxOpen(config.links.github); });
byId("zrx-attribution").addEventListener("click", (event) => { event.preventDefault(); zrxOpen(config.links.attribution); });
byId("zrx-export").addEventListener("click", exportZrxHistory);

bindZrxSetting("zrx-colored-bar", "coloredBar");
bindZrxSetting("zrx-colored-thumbs", "coloredThumbs");
bindZrxSetting("zrx-reformat-likes", "numberDisplayReformatLikes");
bindZrxSetting("zrx-disable-votes", "disableVoteSubmission");

refreshZrxPopup();
