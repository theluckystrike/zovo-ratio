# Privacy

Zovo Ratio sends a YouTube video ID to the Return YouTube Dislike API to retrieve community vote estimates. If vote
submission is enabled, the preserved upstream core also submits the user's like/dislike interaction to that API.

Channel sentiment history, rated history, list-badge cache, settings, and the licence grant are stored in Chrome
extension storage on the user's device. CSV export is generated locally in the popup. Browsing history is not sent
to Zovo.

When the user explicitly clicks **Activate**, the entered licence key and product identifier are sent to Zovo's
Supabase Edge Function for verification. No licence request is made merely by browsing.

API data attribution and usage rights: https://returnyoutubedislike.com/docs/usage-rights
