(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('mockup-menu-config').textContent);
  const panel = document.createElement('div');
  panel.id = 'mockup-menu-panel';
  panel.setAttribute('popover', 'manual');
  document.body.append(panel);
  const favorites = new Set();
  let active = null;
  let frame = 0;
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    playlist: '<rect x="3" y="6" width="14" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12M7 11h6M7 15h6"/>',
    share: '<path d="m14 3 7 6-7 6V11C7 11 4 14 3 20V12c0-5 5-7 11-7Z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
    book: '<path d="M12 5c-3-3-7-3-10-2v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2Zm0 0v16"/>',
    grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m12 5-7 7 7 7M5 12h15"/>'
  };
  function icon(name) {
    const span = document.createElement('span');
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
    return span.firstElementChild;
  }
  function close(restore = true) {
    if (!active) return;
    const trigger = active.trigger;
    trigger.setAttribute('aria-expanded', 'false');
    active = null;
    panel.hidePopover();
    if (restore && trigger.getClientRects().length) trigger.focus({preventScroll: true});
  }
  function position() {
    if (!active) return;
    const r = active.trigger.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    if (!active.trigger.getClientRects().length || r.bottom < 0 || r.top > height) { close(false); return; }
    // Cancel only the baseline's CSS scale for accurate viewport anchoring.
    panel.style.zoom = String(1 / (parseFloat(getComputedStyle(document.body).zoom) || 1));
    panel.style.width = Math.min(active.kind === 'video' ? 290 : 360, width - 16) + 'px';
    panel.style.maxHeight = (height - 16) + 'px';
    const bounds = panel.getBoundingClientRect();
    panel.style.left = Math.max(8, Math.min(r.right - bounds.width, width - bounds.width - 8)) + 'px';
    const top = r.bottom + 6 + bounds.height <= height - 8 ? r.bottom + 6 : r.top - bounds.height - 6;
    panel.style.top = Math.max(8, Math.min(top, height - bounds.height - 8)) + 'px';
  }
  function action(label, glyph, handler, parent = panel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-menu-action';
    button.append(icon(glyph));
    const text = document.createElement('span'); text.textContent = label; button.append(text);
    if (panel.getAttribute('role') === 'menu') { button.setAttribute('role', 'menuitem'); button.tabIndex = -1; }
    button.addEventListener('click', handler);
    parent.append(button);
    return button;
  }
  function feedback(label) {
    const title = active.kind === 'video' ? 'Video options' : active.kind === 'apps' ? 'Apps' : 'All products';
    panel.replaceChildren();
    heading(title);
    panel.setAttribute('role', 'dialog');
    const message = document.createElement('p');
    message.className = 'demo-feedback';message.setAttribute('role', 'status');
    message.textContent = `${label} — preview only. No account changes were made.`;
    panel.append(message);
    action('Back to menu', 'back', () => render(true));
    position(); panel.querySelector('button').focus();
  }
  function heading(label) {
    const row = document.createElement('div'); row.className = 'demo-panel-heading';
    const title = document.createElement('h2'); title.textContent = label;
    const button = document.createElement('button');button.type = 'button';button.className = 'demo-close';button.setAttribute('aria-label', 'Close menu');button.textContent = '×';button.onclick = () => close();
    row.append(title, button);panel.append(row);
    panel.setAttribute('aria-label', label);
  }
  function videoMenu(submenu = false) {
    panel.setAttribute('role', 'menu');panel.setAttribute('aria-label', submenu ? 'Playlist options' : 'Video options');
    if (submenu) {
      action('Back to video options', 'back', () => render(true));
      action('Create New Playlist', 'plus', () => feedback('Create New Playlist'));
      return;
    }
    const selected = favorites.has(active.key);
    const favorite = action(selected ? 'Remove from Favorites' : 'Add to Favorites', 'heart', () => {
      favorites.has(active.key) ? favorites.delete(active.key) : favorites.add(active.key);
      render(true);
    });
    favorite.setAttribute('role', 'menuitemcheckbox');favorite.setAttribute('aria-checked', String(selected));
    const playlist = action('Add to Playlist', 'playlist', () => {
      panel.replaceChildren(); videoMenu(true); position(); focusFirst();
    });
    playlist.setAttribute('aria-haspopup', 'menu');
    const arrow = document.createElement('span'); arrow.className = 'demo-chevron'; arrow.textContent = '›';arrow.setAttribute('aria-hidden','true');playlist.append(arrow);
    action('Share Video', 'share', () => feedback('Share Video'));
    action('Copy Link to Video', 'copy', () => feedback('Copy Link to Video'));
    action('Add to Video Activities', 'video', () => feedback('Add to Video Activities'));
  }
  function appMenu() {
    heading(active.kind === 'apps' ? 'Apps' : 'All products');
    panel.setAttribute('role', 'dialog');
    const groups = active.kind === 'apps' ? config.apps : [{items: config.products}];
    groups.forEach((group, index) => {
      let container = panel;
      if (index) {
        container = document.createElement('details');
        const summary = document.createElement('summary');summary.textContent = group.label;
        container.append(summary);panel.append(container);
        container.addEventListener('toggle', position);
      }
      const grid = document.createElement('div');grid.className = 'demo-app-grid';container.append(grid);
      group.items.forEach(label => action(label, /favorite/i.test(label) ? 'heart' : /playlist/i.test(label) ? 'playlist' : /video/i.test(label) ? 'video' : /course|curriculum|learning/i.test(label) ? 'book' : 'grid', () => feedback(label), grid));
    });
  }
  function focusFirst() {
    const items = panel.querySelectorAll('[role^=menuitem]');
    if (items.length) items[0].tabIndex = 0;
    (items[0] || panel.querySelector('button')).focus({preventScroll: true});
  }
  function render(focus = false) {
    panel.replaceChildren();
    active.kind === 'video' ? videoMenu() : appMenu();
    const note = document.createElement('p');note.className = 'demo-preview-note';note.textContent = 'Mockup preview';panel.append(note);
    position(); if (focus) focusFirst();
  }
  document.querySelectorAll('[data-demo-menu]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();event.stopPropagation();
      if (active?.trigger === trigger) { close();return; }
      close(false);
      active = {trigger, kind: trigger.dataset.demoMenu, key: trigger.getAttribute('aria-label')};
      trigger.setAttribute('aria-expanded', 'true');
      render();panel.showPopover();position();focusFirst();
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault();trigger.click(); }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (active && !panel.contains(event.target) && !active.trigger.contains(event.target)) close(false);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault();event.stopPropagation();close();return; }
    if (event.key === 'Tab' && panel.getAttribute('role') === 'menu') { close();return; }
    if (panel.getAttribute('role') !== 'menu') return;
    const items = [...panel.querySelectorAll('[role^=menuitem]')];
    const current = Math.max(0, items.indexOf(document.activeElement));
    let next;
    if (['ArrowDown','ArrowRight'].includes(event.key)) next = (current + 1) % items.length;
    if (['ArrowUp','ArrowLeft'].includes(event.key)) next = (current - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) { event.preventDefault();items.forEach((item, i) => item.tabIndex = i === next ? 0 : -1);items[next].focus(); }
  });
  document.addEventListener('focusin', event => {
    if (active && !panel.contains(event.target) && event.target !== active.trigger) close(false);
  });
  function schedule(event) {
    if (!active || (event.target instanceof Node && panel.contains(event.target))) return;
    cancelAnimationFrame(frame);frame = requestAnimationFrame(position);
  }
  window.addEventListener('resize', schedule);
  document.addEventListener('scroll', schedule, true);
  new ResizeObserver(() => {
    if (active) { cancelAnimationFrame(frame);frame = requestAnimationFrame(position); }
  }).observe(panel);
})();
