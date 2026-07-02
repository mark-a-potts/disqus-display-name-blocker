// Popup: edit the blocked-name list and options, saved to chrome.storage.sync.
// The content script listens for these changes and re-applies them live.

const DEFAULTS = { dnb_names: ['Reasonable'], dnb_hideCompletely: true, dnb_showBadge: true };

const namesEl  = document.getElementById('names');
const hideEl   = document.getElementById('hide');
const badgeEl  = document.getElementById('badge');
const statusEl = document.getElementById('status');

// Load current settings into the form.
chrome.storage.sync.get(DEFAULTS, cfg => {
  namesEl.value = (cfg.dnb_names || []).join('\n');
  hideEl.checked  = cfg.dnb_hideCompletely !== false;
  badgeEl.checked = cfg.dnb_showBadge !== false;
});

document.getElementById('save').addEventListener('click', () => {
  const names = namesEl.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  chrome.storage.sync.set({
    dnb_names: names,
    dnb_hideCompletely: hideEl.checked,
    dnb_showBadge: badgeEl.checked
  }, () => {
    const n = names.length;
    statusEl.textContent = 'Saved — ' + n + ' name' + (n === 1 ? '' : 's') + ' blocked.';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  });
});
