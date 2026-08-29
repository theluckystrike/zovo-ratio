/** @jest-environment jsdom */

import {
  getZrxChannelHistory,
  getZrxRatedHistory,
  recordZrxChannelSnapshot,
  recordZrxRatedAction,
  readZrxWatchMetadata,
  zrxHistoryToCsv,
  zrxRatioPercent,
} from "./history";

let localStore;

beforeEach(() => {
  localStore = {};
  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys, done) => done(Object.fromEntries(keys.map((key) => [key, localStore[key]])))),
        set: jest.fn((values, done) => { Object.assign(localStore, values); done?.(); }),
      },
    },
  };
});

describe("Zovo Ratio local history", () => {
  it("calculates a stable like ratio", () => {
    expect(zrxRatioPercent(90, 10)).toBe(90);
    expect(zrxRatioPercent(0, 0)).toBe(50);
    expect(zrxRatioPercent("8", "2")).toBe(80);
  });

  it("extracts channel and video metadata from the watch DOM", () => {
    document.body.innerHTML = `
      <ytd-watch-metadata>
        <div id="owner"><a href="/@clear-channel">Clear Channel</a></div>
        <h1><yt-formatted-string>A useful video</yt-formatted-string></h1>
      </ytd-watch-metadata>`;
    expect(readZrxWatchMetadata(document, "https://www.youtube.com/watch?v=abc123")).toEqual({
      channelId: "/@clear-channel",
      channelName: "Clear Channel",
      title: "A useful video",
      videoId: "abc123",
    });
  });

  it("exports spreadsheet-safe CSV with quotes escaped", () => {
    const csv = zrxHistoryToCsv([{
      ratedAt: Date.UTC(2026, 7, 30),
      vote: "like",
      title: 'A "clear" title',
      channelName: "Channel, Inc.",
      ratio: 94.2,
      likes: 942,
      dislikes: 58,
      url: "https://www.youtube.com/watch?v=abc123",
    }]);
    expect(csv).toContain('"A ""clear"" title"');
    expect(csv).toContain('"Channel, Inc."');
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("persists channel snapshots and rated actions in the zrxRatio namespace", async () => {
    const snapshot = {
      videoId: "abc123",
      title: "A useful video",
      channelId: "/@clear-channel",
      channelName: "Clear Channel",
      likes: 90,
      dislikes: 10,
    };
    await recordZrxChannelSnapshot(snapshot);
    await recordZrxRatedAction({ ...snapshot, vote: "like" });
    expect(await getZrxChannelHistory(snapshot.channelId)).toHaveLength(1);
    expect(await getZrxRatedHistory()).toMatchObject([{ videoId: "abc123", vote: "like", ratio: 90 }]);
    expect(Object.keys(localStore).every((key) => key.startsWith("zrxRatio."))).toBe(true);
  });
});
