# Disqus Display-Name Blocker

A tiny Chrome/Chromium extension that hides [Disqus](https://disqus.com) comments by the commenter's **display name** — so you never see a particular person again, even when they keep making brand-new accounts under the same name.

## Why display name, and why an extension?

Disqus only lets you block a **user account**. But a determined troll just registers a new account — same display name, brand-new underlying username — several times a day. Blocking the account can never keep up.

The one thing that stays constant is the **display name**. This extension hides every comment (and reply) whose author display name matches your list, no matter which account it was posted from.

It has to be an **extension**, not a userscript, for a specific reason: Disqus renders comments inside a cross-origin `disqus.com/embed` iframe whose Content Security Policy blocks Tampermonkey/Greasemonkey from injecting into it ([known, unresolved Tampermonkey issue](https://github.com/Tampermonkey/tampermonkey/issues/776)). An extension **content script** runs in an isolated world that the page's CSP doesn't govern, so — with `all_frames` — it can run inside that iframe where a userscript can't.

## Install (Load unpacked)

1. Download this repo (green **Code** button → **Download ZIP**, then unzip — or `git clone`).
2. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the extension folder (the one containing `manifest.json`).
5. Done — it activates automatically on any page with Disqus comments.

## Usage

- Click the extension's toolbar icon to open the settings popup.
- Enter the display names you want to hide, **one per line**, and click **Save**.
- Changes apply live — no page reload needed.

**Matching:**
- A plain line is a **case-insensitive exact** display-name match (e.g. `Reasonable`).
- Wrap a line in slashes for a **regular expression**, e.g. `/^spammer\d+$/i` to catch `spammer1`, `spammer2`, …

**Options:**
- *Hide completely* (default) vs. collapse each blocked comment to a faint, clickable stub you can expand.
- *Show the on-page counter badge* — a small "Name-Blocker on — N comments, M hidden" indicator in the comment area (handy while setting up; turn it off once you trust it).

## How it works

- A content script (`content.js`) is injected into the `disqus.com/embed` iframe in all frames.
- For each comment (`li.post`) it reads the author's display name from the profile link (`.author a`) — deliberately **not** the `data-username`, which changes with every new account.
- Matching comments are hidden (or collapsed). A `MutationObserver` plus a periodic re-scan catch comments and replies that Disqus loads lazily or in real time.
- To avoid a feedback loop (the script's own DOM edits re-triggering the observer, which would stall Disqus's rendering), the observer is disconnected during each scan and calls are debounced.
- Your list is stored in `chrome.storage.sync`, so it follows you across machines signed into the same browser profile.

## Limitations

- Chromium browsers only (Chrome, Edge, Brave, etc.). Firefox's `browser.*` APIs are similar but untested here.
- Matches on the **visible display name**. If the troll changes their display name, add the new one (or a regex).
- If a blocked user posts a **top-level** comment that others reply to, hiding that comment also hides the replies nested under it (they're inside the same `li.post`).
- This is a personal, client-side filter. It does not report, ban, or affect anyone else's view. If a user is evading bans, also consider reporting them to the site's Disqus moderator, who can block by email/IP.

## License

[MIT](./LICENSE)
