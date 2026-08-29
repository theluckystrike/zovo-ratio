/** @jest-environment jsdom */

jest.mock("../config", () => ({
  getApiEndpoint: (path) => `https://returnyoutubedislikeapi.com${path}`,
}));
jest.mock("../utils", () => ({
  getVideoId: (href) => new URL(href).searchParams.get("v"),
}));

import { captureZrxWatchSnapshot, refreshZrxListBadges } from "./experience";

const GOOD_KEY = "ZOVO-LOUD-0123-WXYZ-9876";
let localStore;

beforeEach(() => {
  localStore = {
    "zrxRatio.license": { key: GOOD_KEY, valid: true, activatedAt: Date.now() },
  };
  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys, done) => done(Object.fromEntries(keys.map((key) => [key, localStore[key]])))),
        set: jest.fn((values, done) => { Object.assign(localStore, values); done?.(); }),
      },
    },
  };
  document.body.innerHTML = "";
});

it("renders a per-channel sentiment sparkline under the watch metadata", async () => {
  window.history.replaceState({}, "", "/watch?v=abc123");
  document.body.innerHTML = `
    <ytd-watch-metadata>
      <div id="above-the-fold"></div>
      <div id="owner"><a href="/@clear-channel">Clear Channel</a></div>
      <h1><yt-formatted-string>A useful video</yt-formatted-string></h1>
    </ytd-watch-metadata>`;
  await captureZrxWatchSnapshot({ videoId: "abc123", likes: 90, dislikes: 10 });
  const panel = document.querySelector("#zrx-channel-trend");
  expect(panel).not.toBeNull();
  expect(panel.textContent).toContain("90% liked");
  expect(panel.querySelector(".zrx-channel-trend__line").getAttribute("d")).toContain("M82.0,3.8");
});

it("adds live sentiment badges to a Subscriptions video card", async () => {
  window.history.replaceState({}, "", "/feed/subscriptions");
  document.body.innerHTML = `
    <ytd-rich-item-renderer>
      <a href="https://www.youtube.com/watch?v=list123">Video</a>
      <div id="metadata-line"></div>
    </ytd-rich-item-renderer>`;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ likes: 80, dislikes: 20 }) }));
  await refreshZrxListBadges();
  const badge = document.querySelector(".zrx-sentiment-badge");
  expect(badge).not.toBeNull();
  expect(badge.textContent).toBe("80% liked");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
