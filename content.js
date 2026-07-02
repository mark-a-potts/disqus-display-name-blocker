// Disqus Display-Name Blocker — content script.
//
// Runs INSIDE the disqus.com embed iframe, in the extension's isolated world, so
// the iframe's Content Security Policy can't block it. (That CSP is exactly why an
// ordinary Tampermonkey/Greasemonkey userscript can't do this — see the README.)
//
// It hides comments by the author's *display name*, which is the one thing a troll
// keeps constant across the endless new accounts they create (each new account gets
// a different underlying username, so blocking the account never keeps up).

(function () {
  'use strict';

  // ---- config, loaded from chrome.storage.sync (set via the toolbar popup) ----
  let stringMatchers = [];   // lowercased exact display names
  let regexMatchers = [];    // RegExp objects (from "/pattern/flags" entries)
  let hideCompletely = true; // false => collapse to a faint clickable stub
  let showBadge = true;

  // First-run defaults (used until the user saves their own list via the popup).
  const DEFAULTS = { dnb_names: ['Reasonable'], dnb_hideCompletely: true, dnb_showBadge: true };

  // Parse one saved line into a matcher. "/foo/i" => regex; anything else => exact.
  function buildMatchers(names) {
    stringMatchers = [];
    regexMatchers = [];
    (names || []).forEach(raw => {
      const s = String(raw).trim();
      if (!s) return;
      const m = s.match(/^\/(.*)\/([a-z]*)$/i);
      if (m) {
        try { regexMatchers.push(new RegExp(m[1], m[2])); return; } catch (e) { /* fall through */ }
      }
      stringMatchers.push(s.toLowerCase());
    });
  }

  function nameIsBlocked(name) {
    if (!name) return false;
    const n = name.trim();
    if (stringMatchers.includes(n.toLowerCase())) return true;
    return regexMatchers.some(re => re.test(n));
  }

  // Author DISPLAY NAME = visible text of the profile link inside <span class="author">.
  // Read the text, NOT data-username (that changes with every new account), and scope
  // to the profile link so an "in reply to <name>" link is never mistaken for the author.
  function authorName(post) {
    const a =
      post.querySelector('.author a[data-action="profile"]') ||
      post.querySelector('.author a[data-username]') ||
      post.querySelector('.author a') ||
      post.querySelector('.author');
    return a ? a.textContent : '';
  }

  function hide(post) {
    if (hideCompletely) {
      post.style.setProperty('display', 'none', 'important');
    } else {
      post.style.setProperty('max-height', '1.4em', 'important');
      post.style.setProperty('overflow', 'hidden', 'important');
      post.style.setProperty('opacity', '0.35', 'important');
      post.style.cursor = 'pointer';
      post.title = 'Blocked user — click to reveal';
      post.addEventListener('click', function once() {
        ['max-height', 'overflow', 'opacity'].forEach(p => post.style.removeProperty(p));
        post.title = '';
        post.removeEventListener('click', once);
      });
    }
  }

  function unhide(post) {
    ['display', 'max-height', 'overflow', 'opacity'].forEach(p => post.style.removeProperty(p));
    post.style.removeProperty('cursor');
    post.title = '';
  }

  function apply(post) {
    if (post.dataset.dnbState) return;
    if (nameIsBlocked(authorName(post))) { post.dataset.dnbState = 'hidden'; hide(post); }
    else { post.dataset.dnbState = 'shown'; }
  }

  let lastBadge = '';
  function badge(total, hidden) {
    const b0 = document.getElementById('dnb-badge');
    if (!showBadge) { if (b0) b0.remove(); lastBadge = ''; return; }
    if (!document.body) return;
    const text = 'Name-Blocker on — ' + total + ' comments, ' + hidden + ' hidden';
    if (text === lastBadge) return;   // don't touch the DOM if nothing changed
    lastBadge = text;
    let b = b0;
    if (!b) {
      b = document.createElement('div');
      b.id = 'dnb-badge';
      b.style.cssText =
        'position:fixed;top:6px;left:6px;z-index:2147483647;background:#c0392b;' +
        'color:#fff;font:12px/1.3 sans-serif;padding:5px 8px;border-radius:4px;' +
        'box-shadow:0 1px 4px rgba(0,0,0,.4);opacity:.9;pointer-events:none';
      document.body.appendChild(b);
    }
    b.textContent = text;
  }

  // The observer watches for new/updated comments, but scan() also mutates the DOM
  // (tagging posts, drawing the badge). To avoid a self-triggering feedback loop that
  // would peg the thread and stop Disqus from rendering, we (a) coalesce calls into at
  // most one run per ~250ms, and (b) disconnect the observer while working.
  let observer = null;
  let pending = false;

  function scan() {
    if (observer) observer.disconnect();
    try {
      const posts = document.querySelectorAll('li.post');
      posts.forEach(apply);
      badge(posts.length, document.querySelectorAll('li.post[data-dnb-state="hidden"]').length);
    } catch (e) {
      console.warn('[Disqus Name-Blocker]', e);
    } finally {
      if (observer) observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // After a config change, re-evaluate every post (un-hide names that were removed,
  // hide names that were added).
  function resetAndScan() {
    document.querySelectorAll('li.post').forEach(p => { unhide(p); delete p.dataset.dnbState; });
    lastBadge = '';
    scan();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; scan(); }, 250);
  }

  function start() {
    observer = new MutationObserver(schedule);
    scan();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(schedule, 2000);  // safety net for live-loaded comments/replies
  }

  // Load config, then start. Re-apply live when the popup saves changes.
  chrome.storage.sync.get(DEFAULTS, cfg => {
    buildMatchers(cfg.dnb_names);
    hideCompletely = cfg.dnb_hideCompletely !== false;
    showBadge = cfg.dnb_showBadge !== false;
    start();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.dnb_names) buildMatchers(changes.dnb_names.newValue);
    if (changes.dnb_hideCompletely) hideCompletely = changes.dnb_hideCompletely.newValue !== false;
    if (changes.dnb_showBadge) showBadge = changes.dnb_showBadge.newValue !== false;
    resetAndScan();
  });
})();
