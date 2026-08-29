# Zovo Ratio changes from upstream

Copyright for the original Return YouTube Dislike work remains with Dmitry Selivanov and its contributors.
Zovo modifications are Copyright 2026 Zovo contributors. The combined work remains GPL-3.0-only.

Relative to upstream commit `4e6dfd1977fcf2d160142bf5c2e303d5cda2c685`, this fork:

- rebrands the package and store-facing English locale as **Zovo Ratio** while preserving upstream attribution;
- keeps the upstream RYD API vote-count and vote-submission core;
- upgrades the under-player ratio bar with the unique `zrx-` DOM/CSS namespace;
- records bounded, device-local per-channel ratio history and renders a Pro sparkline;
- injects cached Pro sentiment badges on Watch Later and Subscriptions video cards;
- records the user's rated-video history locally and provides a spreadsheet-safe CSV export;
- adds a server-verified licence layer using the exact `ZOVO-XXXX-XXXX-XXXX-XXXX` grammar and `valid:true` grant;
- requires `SUPABASE_ANON_KEY` at build time;
- replaces Patreon/GitHub premium UI with a single Zovo pricing path while leaving the original code available in
  source history for GPL provenance;
- adds an original teal/coral icon set and a unique light/dark popup design system;
- narrows the shipped locale set to English until the new product strings have genuine translations;
- removes automatic install/update changelog tabs;
- uses unique generated bundle and style basenames (`zrx-*`) to avoid fleet-identical reviewer surfaces;
- adds unit/integration coverage for licensing, storage, CSV, sparkline, and list-badge behavior.

The RYD API is visibly attributed in the popup and the seven-day list cache helps honor its documented rate limits.
