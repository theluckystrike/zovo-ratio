# Building Zovo Ratio

Requirements: Node 20+, npm, and a publishable Supabase anonymous key for the licence verifier.

```bash
npm install
SUPABASE_ANON_KEY=your_publishable_key npm test -- --runInBand
SUPABASE_ANON_KEY=your_publishable_key npm run build
```

Chrome output: `Extensions/combined/dist/chrome`.

The production webpack configuration intentionally refuses to emit any build when `SUPABASE_ANON_KEY` is absent.
This prevents a superficially working package whose paid tier can never contact the licence service. The key is a
Supabase publishable client credential, not a privileged server secret.

The client accepts only the checkout shape `ZOVO-XXXX-XXXX-XXXX-XXXX`, posts `{license_key, extension}` to the
licence function, and grants when the response contains `valid: true`. It never requires `tier === "pro"`, because
valid lifetime customers must also unlock the paid features.

The GPL-3.0 permits rebuilding this source with different feature defaults. The shipped wall is not represented as
a technical restriction on downstream GPL recipients.
