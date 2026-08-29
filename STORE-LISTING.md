# Chrome Web Store draft copy

## Title

Zovo Ratio

## Summary

YouTube like and dislike ratio, channel sentiment history, list badges, and rated-history CSV export.

## Detailed description

See YouTube sentiment before you commit your time.

Zovo Ratio restores estimated dislike counts through the open Return YouTube Dislike API, then adds a clearer inline
like/dislike ratio under the player. Pro users can see a recent sentiment sparkline for each channel, quick sentiment
badges on Watch Later and Subscriptions, and export their own rated-video history as CSV.

Your channel and rated histories stay in extension storage on this device. CSV files are generated locally. Licence
verification happens only when you click Activate.

Data is provided by Return YouTube Dislike and is subject to estimation. Attribution:
https://returnyoutubedislike.com

Complete GPL-3.0 modified source and change history:
https://github.com/theluckystrike/zovo-ratio

## Category

Accessibility

## Permission justification

- `storage`: saves display settings, bounded channel/rated history, cached list sentiment, and licence state locally.
- `youtube.com` host access: reads video IDs and adds ratio, sparkline, and sentiment-badge UI on YouTube pages.
- `returnyoutubedislikeapi.com` host access: retrieves dislike estimates and preserves optional upstream vote submission.
- `zgubxqomnbmxgbdhvwja.supabase.co` host access: verifies a key only after the user clicks Activate.

## Commercial and GPL disclosure

The paid wall is a distribution convenience, not a technical restriction under GPL-3.0. Users may obtain, modify,
and rebuild the complete source under the GPL.
