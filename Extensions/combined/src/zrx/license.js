/*
 * Zovo Ratio licence verification.
 *
 * GPL note: this gate is a distribution convenience, not a technical
 * restriction on the corresponding source. Anyone may rebuild this GPL-3.0
 * fork with different feature defaults.
 */

export const ZRX_LICENSE_KEY_RE = /^ZOVO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const ZRX_VERIFY_URL =
  "https://zgubxqomnbmxgbdhvwja.supabase.co/functions/v1/verify-extension-license";
const ZRX_EXTENSION_KEY = "ratio";
const ZRX_LICENSE_STORAGE_KEY = "zrxRatio.license";
const ZRX_VERIFY_TIMEOUT_MS = 8000;
const ZRX_ANON_KEY =
  typeof __ZRX_SUPABASE_ANON_KEY__ === "string" ? __ZRX_SUPABASE_ANON_KEY__ : "";

function zrxStorage() {
  const runtimeApi = typeof chrome !== "undefined" ? chrome : browser;
  return runtimeApi.storage.local;
}

function zrxStorageGet(key) {
  return new Promise((resolve) => {
    try {
      zrxStorage().get([key], (result) => resolve(result?.[key]));
    } catch (_) {
      resolve(undefined);
    }
  });
}

function zrxStorageSet(value) {
  return new Promise((resolve) => {
    try {
      zrxStorage().set(value, () => resolve(true));
    } catch (_) {
      resolve(false);
    }
  });
}

export function normalizeZrxLicenseKey(raw) {
  if (typeof raw !== "string" || raw.length > 64) return null;
  const normalized = raw.trim().toUpperCase();
  return ZRX_LICENSE_KEY_RE.test(normalized) ? normalized : null;
}

export async function getZrxLicenseState() {
  const record = await zrxStorageGet(ZRX_LICENSE_STORAGE_KEY);
  if (!record || record.valid !== true) return { valid: false, tier: "free" };
  if (normalizeZrxLicenseKey(record.key) === null) return { valid: false, tier: "free" };
  if (!Number.isFinite(record.activatedAt)) return { valid: false, tier: "free" };
  return { valid: true, tier: "pro", activatedAt: record.activatedAt };
}

export async function activateZrxLicense(raw, options = {}) {
  const key = normalizeZrxLicenseKey(raw);
  const anonKey = options.anonKey || ZRX_ANON_KEY;
  const fetchImpl = options.fetchImpl || fetch;
  if (!key || !anonKey) return { valid: false, error: "invalid-key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ZRX_VERIFY_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ZRX_VERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ license_key: key, extension: ZRX_EXTENSION_KEY }),
      signal: controller.signal,
    });
    if (!response.ok) return { valid: false, error: "invalid-key" };
    const verdict = await response.json().catch(() => null);
    if (!verdict || verdict.valid !== true) return { valid: false, error: "invalid-key" };

    // valid:true is the grant. Never gate on tier=='pro': lifetime is valid.
    const stored = await zrxStorageSet({
      [ZRX_LICENSE_STORAGE_KEY]: {
        key,
        valid: true,
        serverTier: typeof verdict.tier === "string" ? verdict.tier : "pro",
        activatedAt: Date.now(),
      },
    });
    return stored ? { valid: true, tier: "pro" } : { valid: false, error: "storage-failure" };
  } catch (_) {
    return { valid: false, error: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

export async function deactivateZrxLicense() {
  await zrxStorageSet({
    [ZRX_LICENSE_STORAGE_KEY]: { valid: false, tier: "free", deactivatedAt: Date.now() },
  });
}

export { ZRX_LICENSE_STORAGE_KEY };
