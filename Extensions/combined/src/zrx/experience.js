import { getApiEndpoint } from "../config";
import { getVideoId } from "../utils";
import { getZrxLicenseState, ZRX_LICENSE_STORAGE_KEY } from "./license";
import {
  ZRX_BADGE_CACHE_KEY,
  getZrxChannelHistory,
  readZrxWatchMetadata,
  recordZrxChannelSnapshot,
  recordZrxRatedAction,
  zrxRatioPercent,
  zrxStorageGet,
  zrxStorageSet,
} from "./history";

const ZRX_BADGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const zrxPendingBadgeIds = new Set();
let zrxListObserver = null;
let zrxLastWatchSnapshot = null;
let zrxLicenseListenerAdded = false;

function zrxOnWatchPage() {
  return location.pathname === "/watch" || location.pathname.startsWith("/shorts/");
}

function zrxOnSupportedListPage() {
  if (location.pathname === "/feed/subscriptions") return true;
  try {
    return location.pathname === "/playlist" && new URL(location.href).searchParams.get("list") === "WL";
  } catch (_) {
    return false;
  }
}

function zrxSparklinePath(rows, width = 164, height = 38) {
  if (!rows.length) return "";
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
    const ratio = Math.max(0, Math.min(100, Number(row.ratio) || 0));
    const y = height - (ratio / 100) * height;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(" ");
}

async function renderZrxChannelSparkline(snapshot) {
  const tier = await getZrxLicenseState();
  const old = document.getElementById("zrx-channel-trend");
  if (!tier.valid || !zrxOnWatchPage()) {
    old?.remove();
    return;
  }
  const rows = await getZrxChannelHistory(snapshot.channelId);
  const target =
    document.querySelector("ytd-watch-metadata #above-the-fold") ||
    document.querySelector("ytd-watch-flexy #below") ||
    document.querySelector("#info");
  if (!target || !rows.length) return;

  const recent = rows.slice(-12);
  const average = Math.round(recent.reduce((sum, row) => sum + (Number(row.ratio) || 0), 0) / recent.length);
  const path = zrxSparklinePath(recent);
  const panel = old || document.createElement("section");
  panel.id = "zrx-channel-trend";
  panel.className = "zrx-channel-trend";
  panel.setAttribute("aria-label", `${snapshot.channelName} recent average sentiment ${average}% liked`);
  panel.innerHTML = `
    <div class="zrx-channel-trend__copy">
      <span class="zrx-channel-trend__eyebrow">Channel sentiment</span>
      <strong>${average}% liked</strong>
      <span>${recent.length} ${recent.length === 1 ? "video" : "videos"} · ${snapshot.channelName}</span>
    </div>
    <svg class="zrx-channel-trend__spark" viewBox="0 0 164 38" role="img" aria-label="Recent like-ratio trend">
      <path class="zrx-channel-trend__baseline" d="M0,19 L164,19"></path>
      <path class="zrx-channel-trend__line" d="${path}"></path>
    </svg>`;
  if (!old) target.appendChild(panel);
}

export async function captureZrxWatchSnapshot(stats) {
  if (!stats?.videoId || !Number.isFinite(Number(stats.likes)) || !Number.isFinite(Number(stats.dislikes))) return;
  const meta = readZrxWatchMetadata(document, location.href);
  const snapshot = { ...meta, ...stats, videoId: stats.videoId || meta.videoId };
  zrxLastWatchSnapshot = snapshot;
  await recordZrxChannelSnapshot(snapshot);
  await renderZrxChannelSparkline(snapshot);
}

export async function captureZrxRatedAction(vote, stats) {
  const meta = readZrxWatchMetadata(document, location.href);
  const videoId = getVideoId(location.href) || meta.videoId;
  await recordZrxRatedAction({ ...meta, ...stats, videoId, vote });
}

function zrxBadgeTone(ratio) {
  if (ratio >= 90) return "strong";
  if (ratio >= 70) return "mixed";
  return "caution";
}

function insertZrxBadge(card, stats) {
  if (!card || card.querySelector(":scope .zrx-sentiment-badge")) return;
  const ratio = zrxRatioPercent(stats.likes, stats.dislikes);
  const badge = document.createElement("span");
  badge.className = `zrx-sentiment-badge zrx-sentiment-badge--${zrxBadgeTone(ratio)}`;
  badge.textContent = `${Math.round(ratio)}% liked`;
  badge.setAttribute("aria-label", `Community sentiment: ${Math.round(ratio)} percent liked`);
  const anchor =
    card.querySelector("#metadata-line") ||
    card.querySelector("#meta") ||
    card.querySelector("#video-title")?.parentElement ||
    card;
  anchor.appendChild(badge);
}

async function fetchZrxBadgeStats(videoId) {
  const cache = await zrxStorageGet(ZRX_BADGE_CACHE_KEY, {});
  const hit = cache[videoId];
  if (hit && Date.now() - hit.cachedAt < ZRX_BADGE_CACHE_TTL) return hit;
  const response = await fetch(getApiEndpoint(`/votes?videoId=${encodeURIComponent(videoId)}`), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`vote lookup ${response.status}`);
  const body = await response.json();
  const next = {
    likes: Number(body.likes) || 0,
    dislikes: Number(body.dislikes) || 0,
    cachedAt: Date.now(),
  };
  const entries = Object.entries({ ...cache, [videoId]: next })
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
    .slice(0, 500);
  await zrxStorageSet({ [ZRX_BADGE_CACHE_KEY]: Object.fromEntries(entries) });
  return next;
}

export async function refreshZrxListBadges() {
  if (!zrxOnSupportedListPage()) return;
  const tier = await getZrxLicenseState();
  if (!tier.valid) return;
  const cards = [...document.querySelectorAll("ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer")];
  const jobs = [];
  for (const card of cards) {
    if (jobs.length >= 20 || card.querySelector(":scope .zrx-sentiment-badge")) continue;
    const link = card.querySelector('a[href*="/watch?v="]');
    if (!link) continue;
    let videoId = "";
    try {
      videoId = new URL(link.href, location.origin).searchParams.get("v") || "";
    } catch (_) {}
    if (!videoId || zrxPendingBadgeIds.has(videoId)) continue;
    zrxPendingBadgeIds.add(videoId);
    jobs.push(
      fetchZrxBadgeStats(videoId)
        .then((stats) => insertZrxBadge(card, stats))
        .catch(() => {})
        .finally(() => zrxPendingBadgeIds.delete(videoId)),
    );
  }
  await Promise.all(jobs);
}

export async function refreshZrxExperience() {
  if (zrxLastWatchSnapshot) await renderZrxChannelSparkline(zrxLastWatchSnapshot);
  await refreshZrxListBadges();
}

export function startZrxListBadges() {
  if (!zrxOnSupportedListPage()) {
    zrxListObserver?.disconnect();
    zrxListObserver = null;
    return;
  }
  refreshZrxListBadges();
  if (!zrxListObserver && document.body) {
    let timer = null;
    zrxListObserver = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(refreshZrxListBadges, 250);
    });
    zrxListObserver.observe(document.body, { childList: true, subtree: true });
  }
}

export function watchZrxLicenseChanges() {
  if (zrxLicenseListenerAdded) return;
  const runtimeApi = typeof chrome !== "undefined" ? chrome : browser;
  runtimeApi.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[ZRX_LICENSE_STORAGE_KEY]) refreshZrxExperience();
  });
  zrxLicenseListenerAdded = true;
}

export { zrxSparklinePath };
