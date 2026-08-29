const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

const extensionVersion = process.env.npm_package_version.replace("-", ".");
const entrySources = {
  "zrx-core": "ryd.content-script",
  "zrx-worker": "ryd.background",
  "zrx-console": "popup",
  "zrx-menu-bridge": "menu-fixer",
};
const sourceEntries = Object.values(entrySources);

const ignorePatterns = [
  "**/manifest-**",
  "**/dist/**",
  "**/src/**",
  "**/readme.md",
  "**/_locales/**",
  "**/icons/**",
  "**/popup.css",
  "**/content-style.css",
  "**/ryd.changelog.js",
  "**/changelog/**",
  "**/menu-fixer.js",
  ...sourceEntries.map((entry) => `**/${entry}.js`),
];

const manifestTransform = (content, filename) => {
  const filteredContent = content
    .toString()
    .split("\n")
    .filter((str) => !str.trimStart().startsWith("//"))
    .join("\n");

  const manifestData = JSON.parse(filteredContent);
  manifestData.version = extensionVersion;
  return JSON.stringify(manifestData, null, 2);
};

const i18nTransform = (content, filename) => {
  if (!filename.endsWith("messages.json")) return content;

  return content.toString().replace(/__RYD_VERSION__/g, extensionVersion);
};

class MirrorJsOutputsPlugin {
  constructor(targetDirs) {
    this.targetDirs = targetDirs;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise("MirrorJsOutputsPlugin", async () => {
      const { promises: fsp } = fs;
      const outputPath = compiler.options.output.path;
      const entries = await fsp.readdir(outputPath).catch(() => []);
      const jsAssets = entries.filter((name) => name.endsWith(".js"));

      await Promise.all(
        this.targetDirs.map(async (dir) => {
          const targetDir = path.join(outputPath, dir);
          await fsp.mkdir(targetDir, { recursive: true });

          const existingFiles = await fsp.readdir(targetDir).catch(() => []);
          await Promise.all(
            existingFiles
              .filter((file) => file.endsWith(".js"))
              .map((file) => fsp.rm(path.join(targetDir, file), { force: true }))
          );

          await Promise.all(
            jsAssets.map((asset) =>
              fsp.copyFile(path.join(outputPath, asset), path.join(targetDir, path.basename(asset))),
            ),
          );
        }),
      );
    });
  }
}

module.exports = (env, argv) => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY must be set at build time; refusing to emit a paid tier that dies offline.");
  }

  return {
  entry: Object.fromEntries(
    Object.entries(entrySources).map(([name, source]) => [name, path.join(__dirname, "./Extensions/combined/", `${source}.js`)]),
  ),
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "Extensions/combined/dist"),
    clean: true,
  },
  cache: false,
  optimization: {
    minimize: false,
  },
  watchOptions: {
    ignored: "**/dist/**",
  },
  plugins: [
    // exclude locale files in moment
    new CopyPlugin({
      patterns: [
        {
          from: "./Extensions/combined",
          to: "./chrome",
          globOptions: {
            ignore: ignorePatterns,
          },
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/manifest-chrome.json",
          to: "./chrome/manifest.json",
          transform: manifestTransform,
        },
        {
          from: "./Extensions/combined/_locales/en",
          to: "./chrome/_locales/en",
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/icons/zrx-icon-*.png",
          to: "./chrome/icons/[name][ext]",
          globOptions: { ignore: ["**/*master*"] },
        },
        {
          from: "./Extensions/combined",
          to: "./firefox",
          globOptions: {
            ignore: ignorePatterns,
          },
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/manifest-firefox.json",
          to: "./firefox/manifest.json",
          transform: manifestTransform,
        },
        {
          from: "./Extensions/combined/_locales/en",
          to: "./firefox/_locales/en",
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/icons/zrx-icon-*.png",
          to: "./firefox/icons/[name][ext]",
          globOptions: { ignore: ["**/*master*"] },
        },
        {
          from: "./Extensions/combined",
          to: "./safari",
          globOptions: {
            ignore: ignorePatterns,
          },
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/manifest-safari.json",
          to: "./safari/manifest.json",
          transform: manifestTransform,
        },
        {
          from: "./Extensions/combined/_locales/en",
          to: "./safari/_locales/en",
          transform: i18nTransform,
        },
        {
          from: "./Extensions/combined/icons/zrx-icon-*.png",
          to: "./safari/icons/[name][ext]",
          globOptions: { ignore: ["**/*master*"] },
        },
      ],
    }),
    new webpack.DefinePlugin({
      __ZRX_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    }),
    new MirrorJsOutputsPlugin(["chrome", "firefox", "safari"]),
  ],
  experiments: {
    topLevelAwait: true,
  },
  devtool: argv.mode === "development" ? "inline-source-map" : false,
  };
};
