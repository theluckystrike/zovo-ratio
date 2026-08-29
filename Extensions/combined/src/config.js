const PROD_API_URL = "https://returnyoutubedislikeapi.com";
const DEV_API_URL = PROD_API_URL;

const runtime = typeof chrome !== "undefined" ? chrome.runtime : null;
const manifest = typeof runtime?.getManifest === "function" ? runtime.getManifest() : null;
const isDevelopment = !manifest || !("update_url" in manifest);

const extensionChangelogUrl =
  runtime && typeof runtime.getURL === "function"
    ? runtime.getURL("changelog/4/changelog_4.0.html")
    : "https://returnyoutubedislike.com/changelog/4/changelog_4.0.html";

const config = {
  apiUrl: isDevelopment ? DEV_API_URL : PROD_API_URL,

  voteDisabledIconName: "zrx-icon-128.png",
  defaultIconName: "zrx-icon-128.png",

  links: {
    website: "https://zovo.one",
    github: "https://github.com/theluckystrike/zovo-ratio",
    pricing: "https://zovo.one/pricing",
    attribution: "https://returnyoutubedislike.com",
    faq: "https://zovo.one",
    help: "https://zovo.one",
    changelog: extensionChangelogUrl,
  },

  defaultExtConfig: {
    disableVoteSubmission: false,
    disableLogging: true,
    coloredThumbs: false,
    coloredBar: false,
    colorTheme: "classic",
    numberDisplayFormat: "compactShort",
    numberDisplayReformatLikes: false,
    hidePremiumTeaser: false,
  },
};

function getApiUrl() {
  return config.apiUrl;
}

function getApiEndpoint(endpoint) {
  return `${config.apiUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
}

function getChangelogUrl() {
  return config.links?.changelog ?? extensionChangelogUrl;
}

export { config, getApiUrl, getApiEndpoint, getChangelogUrl };
