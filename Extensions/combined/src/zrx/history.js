const ZRX_RATED_HISTORY_KEY = "zrxRatio.ratedHistory";
const ZRX_CHANNEL_HISTORY_KEY = "zrxRatio.channelHistory";
const ZRX_BADGE_CACHE_KEY = "zrxRatio.badgeCache";
const ZRX_RATED_LIMIT = 1000;
const ZRX_CHANNEL_LIMIT = 24;
const ZRX_CHANNEL_COUNT_LIMIT = 80;

function zrxStorage() {
  const runtimeApi = typeof chrome !== "undefined" ? chrome : browser;
  return runtimeApi.storage.local;
}

export function zrxStorageGet(key, fallback) {
  return new Promise((resolve) => {
    try {
      zrxStorage().get([key], (result) => resolve(result?.[key] ?? fallback));
    } catch (_) {
      resolve(fallback);
    }
  });
}

export function zrxStorageSet(values) {
  return new Promise((resolve) => {
    try {
      zrxStorage().set(values, () => resolve(true));
    } catch (_) {
      resolve(false);
    }
  });
}

export function zrxRatioPercent(likes, dislikes) {
  const likeCount = Number(likes) || 0;
  const dislikeCount = Number(dislikes) || 0;
  const total = likeCount + dislikeCount;
  return total > 0 ? Math.round((likeCount / total) * 1000) / 10 : 50;
}

export function readZrxWatchMetadata(doc = document, href = location.href) {
  const ownerLink = doc.querySelector(
    "ytd-watch-metadata #owner a[href], #upload-info #channel-name a[href], ytd-video-owner-renderer a[href]",
  );
  const ownerHref = ownerLink?.getAttribute("href") || "";
  const channelId = ownerHref.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0] || "unknown-channel";
  const channelName =
    ownerLink?.textContent?.trim() ||
    doc.querySelector("ytd-watch-metadata #owner-name")?.textContent?.trim() ||
    "Unknown channel";
  const title =
    doc.querySelector("ytd-watch-metadata h1 yt-formatted-string, h1.title yt-formatted-string")?.textContent?.trim() ||
    doc.title.replace(/\s+-\s+YouTube$/, "") ||
    "Untitled video";
  let videoId = "";
  try {
    const url = new URL(href);
    videoId = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
  } catch (_) {}
  return { channelId, channelName, title, videoId };
}

export async function recordZrxChannelSnapshot(snapshot) {
  if (!snapshot?.videoId || !snapshot?.channelId) return [];
  const all = await zrxStorageGet(ZRX_CHANNEL_HISTORY_KEY, {});
  const rows = Array.isArray(all[snapshot.channelId]) ? all[snapshot.channelId] : [];
  const entry = {
    videoId: snapshot.videoId,
    title: snapshot.title || "Untitled video",
    channelId: snapshot.channelId,
    channelName: snapshot.channelName || "Unknown channel",
    likes: Number(snapshot.likes) || 0,
    dislikes: Number(snapshot.dislikes) || 0,
    ratio: zrxRatioPercent(snapshot.likes, snapshot.dislikes),
    seenAt: Date.now(),
  };
  const nextRows = [...rows.filter((row) => row.videoId !== entry.videoId), entry].slice(-ZRX_CHANNEL_LIMIT);
  const next = { ...all, [entry.channelId]: nextRows };
  const orderedChannels = Object.entries(next).sort((a, b) => {
    const aTime = a[1]?.[a[1].length - 1]?.seenAt || 0;
    const bTime = b[1]?.[b[1].length - 1]?.seenAt || 0;
    return bTime - aTime;
  });
  await zrxStorageSet({ [ZRX_CHANNEL_HISTORY_KEY]: Object.fromEntries(orderedChannels.slice(0, ZRX_CHANNEL_COUNT_LIMIT)) });
  return nextRows;
}

export async function getZrxChannelHistory(channelId) {
  const all = await zrxStorageGet(ZRX_CHANNEL_HISTORY_KEY, {});
  return Array.isArray(all[channelId]) ? all[channelId] : [];
}

export async function recordZrxRatedAction(entry) {
  if (!entry?.videoId || !["like", "dislike", "neutral"].includes(entry.vote)) return [];
  const rows = await zrxStorageGet(ZRX_RATED_HISTORY_KEY, []);
  const normalized = {
    ratedAt: Date.now(),
    videoId: entry.videoId,
    title: entry.title || "Untitled video",
    channelId: entry.channelId || "unknown-channel",
    channelName: entry.channelName || "Unknown channel",
    vote: entry.vote,
    likes: Number(entry.likes) || 0,
    dislikes: Number(entry.dislikes) || 0,
    ratio: zrxRatioPercent(entry.likes, entry.dislikes),
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(entry.videoId)}`,
  };
  const next = [...rows.filter((row) => row.videoId !== normalized.videoId), normalized].slice(-ZRX_RATED_LIMIT);
  await zrxStorageSet({ [ZRX_RATED_HISTORY_KEY]: next });
  return next;
}

export async function getZrxRatedHistory() {
  const rows = await zrxStorageGet(ZRX_RATED_HISTORY_KEY, []);
  return Array.isArray(rows) ? rows : [];
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function zrxHistoryToCsv(rows) {
  const header = ["rated_at", "vote", "video_title", "channel", "like_ratio_percent", "likes", "dislikes", "video_url"];
  const body = rows.map((row) => [
    row.ratedAt ? new Date(row.ratedAt).toISOString() : "",
    row.vote,
    row.title,
    row.channelName,
    row.ratio,
    row.likes,
    row.dislikes,
    row.url,
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export { ZRX_RATED_HISTORY_KEY, ZRX_CHANNEL_HISTORY_KEY, ZRX_BADGE_CACHE_KEY };
