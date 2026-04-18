# Just Translate

Auto-translates every post on X (Twitter) into your browser's language — no clicking the **Show translation** button, no waiting, no exceptions.

X only renders its translate button on one tweet at a time (the "focal" tweet on a status page). Every other post is silently left in its original language, even when X knows the translation. Just Translate bypasses the UI gate and calls the same backend X does, for every tweet as it enters your timeline.

## What it does

- Watches the timeline, profile pages, search, hashtags — anywhere tweets render.
- For every post not in your browser's language, swaps the text in place with the translation.
- Adds a small `Translated from <Language> · Show original` line above each translated post. Click to toggle back.
- Uses your existing X session (no login, no API key, no external servers).

## Install (Chrome / Edge / Brave / Arc)

1. Download the latest release zip: <https://github.com/derwolz/just-translate/releases/latest> — or clone this repo.
2. Unzip it somewhere you'll keep it (don't delete the folder — Chrome reloads from it every launch).
3. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
4. Toggle **Developer mode** on (top-right).
5. Click **Load unpacked** and pick the unzipped folder (the one containing `manifest.json`).
6. Open x.com — foreign-language posts should now show translated text with the toggle line above them.

That's the whole install. No store, no account, no build step.

## Install (Firefox)

Firefox supports MV3 content scripts but loads unpacked extensions as *temporary* — they vanish on browser restart.

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**
3. Pick the `manifest.json` from the unzipped folder.

For a permanent install on Firefox, the extension needs to be signed through addons.mozilla.org — not yet done.

## How it works

- A content script runs on `x.com` / `twitter.com`.
- A `MutationObserver` detects tweets as they enter the DOM.
- For each tweet whose `lang` attribute differs from your browser language, it calls `POST https://api.x.com/2/grok/translation.json` with the tweet ID, authenticated by your existing `ct0` CSRF cookie and X's public web bearer token.
- The response text replaces the tweet text in place; the original is kept in memory so the toggle can restore it.

No data leaves your browser beyond the request X itself would make if you clicked their button.

## Why it exists

X's `is_translatable` GraphQL flag is `true` for virtually every non-English post, meaning X's backend *knows* it can translate them. The reason the button doesn't appear is a React prop — `isFocal: true` — which is only set on the single focused tweet of a status page. That's a UI choice, not a capability limit. This extension ignores it.

## Caveats

- Uses X's internal endpoint. If X changes the shape of that endpoint, translations will stop working until the script is updated. Open an issue if that happens.
- The bearer token in `content.js` is X's public web-client token (shipped in every browser session, visible in devtools) — it is not a secret. It's hardcoded only because X doesn't expose a way to read it out of the running page at the right moment.
- Rate-limited by X, not by the extension. If you scroll a massive foreign-language feed very fast, some translations may miss; they'll pick up as you scroll past them again.
- Does not translate quote-tweeted posts inside other posts yet, or posts inside notifications/DMs.

## License

MIT. See [LICENSE](LICENSE).
