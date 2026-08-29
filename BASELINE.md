# Unmodified upstream baseline

Baseline proved before the `zovo-ratio` branch was created.

- Upstream: `Anarios/return-youtube-dislike`
- Commit: `4e6dfd1977fcf2d160142bf5c2e303d5cda2c685`
- Commit subject: `Add Traditional Chinese README and normalize language navigation (#1299)`
- Node: `v20.17.0`
- npm: `10.8.2`
- Baseline command from `open-source-packages/README.md`: `npm install && npm run build`
- Install result: 668 packages installed. npm reported 18 dependency-audit findings (1 low, 8 moderate, 9 high).
- Build result: webpack 5.89.0 compiled successfully with only bundle-size recommendations.
- Chrome runtime result: Chrome for Testing 149 registered service worker
  `chrome-extension://nbbkdddaalaokmmpdjaadebonikidgfo/ryd.background.js` and opened the upstream changelog page.
- Baseline output: `_source-builds/zovo-ratio-upstream-baseline/Extensions/combined/dist/chrome`

The first sandboxed dependency attempt failed DNS resolution and left partial `node_modules` state. That was an
environment failure, not an upstream finding. The generated residue was moved aside, the exact install was rerun
with network access, and the untouched tracked tree then built and loaded successfully.

## API dependency gate

The current Return YouTube Dislike usage-rights page states that third-party use of the open API is allowed and
lists two restrictions: clear attribution and rate limits of 100 requests/minute and 10,000/day. It contains no
non-commercial restriction. Zovo Ratio preserves visible attribution and caches list lookups for seven days.

Authoritative page: https://returnyoutubedislike.com/docs/usage-rights
