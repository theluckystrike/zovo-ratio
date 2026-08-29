/** @jest-environment jsdom */

import {
  ZRX_LICENSE_KEY_RE,
  activateZrxLicense,
  getZrxLicenseState,
  normalizeZrxLicenseKey,
} from "./license";

const GOOD_KEY = "ZOVO-LOUD-0123-WXYZ-9876";
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

describe("Zovo Ratio licence layer 5.95", () => {
  it("shape-checks the checkout grammar including L, O, and U", () => {
    expect(ZRX_LICENSE_KEY_RE.test(GOOD_KEY)).toBe(true);
    expect(normalizeZrxLicenseKey(`  ${GOOD_KEY.toLowerCase()} `)).toBe(GOOD_KEY);
    expect(normalizeZrxLicenseKey("RATIO-LOUD-0123-WXYZ-9876")).toBeNull();
    expect(normalizeZrxLicenseKey("ZOVO-AAAA-BBBB-CCCC")).toBeNull();
  });

  it.each(["pro", "lifetime"])("grants on valid:true for server tier %s", async (tier) => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ valid: true, tier }),
    }));
    const result = await activateZrxLicense(GOOD_KEY, { fetchImpl, anonKey: "publishable-test-key" });
    expect(result).toEqual({ valid: true, tier: "pro" });
    expect(await getZrxLicenseState()).toMatchObject({ valid: true, tier: "pro" });
    const request = fetchImpl.mock.calls[0];
    expect(request[0]).toContain("functions/v1/verify-extension-license");
    expect(JSON.parse(request[1].body)).toEqual({ license_key: GOOD_KEY, extension: "ratio" });
  });

  it("fails closed when the server does not return valid:true", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ valid: false, tier: "pro" }) }));
    expect(await activateZrxLicense(GOOD_KEY, { fetchImpl, anonKey: "publishable-test-key" }))
      .toEqual({ valid: false, error: "invalid-key" });
    expect(await getZrxLicenseState()).toEqual({ valid: false, tier: "free" });
  });
});
