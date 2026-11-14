/* D4 Trip ticket photo gallery — local IndexedDB, optional authenticated shared adapter. */
(() => {
  'use strict';
  const local = window.D4TripLocal;
  const PREFIX = 'd4-trip-ticket-list-v1:';
  const DB_NAME = 'd4-trip-ticket-photos-v1';
  const MAX_BYTES = 15 * 1024 * 1024;
  const urls = new Map();
  const pending = new Set();
  let selectedTrip = '', tickets = [], cloud = null, unsubscribe = null;
  let message = '', busy = false, currentNode = null, sequence = 0;

  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function shared() { return !!local?.teamId; }
  function editable() { return local?.canEditTickets?.() === true; }
  function database() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Photo storage is unavailable on this browser'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open photo storage'));
    });
  }
  async function photoStore(key, mode, value) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', mode === 'get' ? 'readonly' : 'readwrite');
      const req = tx.objectStore('photos')[mode](...(mode === 'put' ? [value, key] : [key]));
      let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Photo storage operation failed')); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('Photo storage operation cancelled')); };
    });
  }
  function readList(id) {
    try {
      const data = JSON.parse(localStorage.getItem(PREFIX + id) || '[]');
      return Array.isArray(data) ? data.filter(x => x && /^(up|down)$/.test(x.direction) && typeof x.id === 'string') : [];
    } catch { return []; }
  }
  function saveList(id, items) { localStorage.setItem(PREFIX + id, JSON.stringify(items)); }
  function destroyPreview() {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear(); pending.clear();
  }
  function release() {
    sequence++;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    destroyPreview();
    selectedTrip = ''; tickets = []; currentNode = null;
  }
  function readableDate(value) {
    const ms = typeof value === 'number' ? value : value?.seconds ? value.seconds * 1000 : Date.now();
    return new Date(ms).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
  }
  function group(direction) {
    const list = tickets.filter(x => x.direction === direction);
    const editor = editable();
    const title = direction === 'up' ? 'UP TICKETS' : 'DOWN TICKETS';
    const detail = direction === 'up' ? 'Onward journey' : 'Return journey';
    const emoji = direction === 'up' ? '🛫' : '🛬';
    return '<section class="d4-tkt-group">' +
      '<header class="d4-tkt-group-heading"><span class="d4-tkt-emblem">' + emoji + '</span><div><h3>' + title +
      '</h3><p>' + detail + '</p></div><strong class="d4-tkt-counter">' + list.length + ' Photos</strong></header>' +
      (editor ? '<button type="button" class="d4-tkt-add" data-tkt-add="' + direction + '">＋ Add ' + (direction === 'up' ? 'Up' : 'Down') +
        ' Ticket Photos</button><input class="d4-tkt-input" type="file" accept="image/*" multiple data-tkt-input="' + direction +
        '" aria-label="' + title + ' photo files" hidden>' : '<p class="d4-tkt-viewonly">👁️ Members can view the tickets added by admins.</p>') +
      '<div class="d4-tkt-grid">' + (list.length ? list.map((x, i) =>
        '<article class="d4-tkt-photo"><button type="button" class="d4-tkt-image-button" data-tkt-open="' + escapeText(x.id) +
        '" aria-label="Preview ' + escapeText(x.name || 'ticket') + '"><span class="d4-tkt-placeholder">🎟️</span>' +
        '<img data-tkt-image="' + escapeText(x.id) + '" alt="' + escapeText(x.name || 'Ticket photo') + '" hidden></button>' +
        '<div class="d4-tkt-info"><strong>Ticket ' + String(i + 1).padStart(2, '0') + '</strong>' +
        '<small title="' + escapeText(x.name) + '">' + escapeText(x.name || 'Ticket photo') + '</small>' +
        '<small>' + readableDate(x.createdAt) + '</small>' +
        (editor ? '<button type="button" class="d4-tkt-delete" data-tkt-delete="' + escapeText(x.id) +
          '" aria-label="Delete ' + escapeText(x.name || 'ticket') + '">🗑 Delete</button>' : '') + '</div></article>'
      ).join('') : '<div class="d4-tkt-empty">📸 No ' + direction + ' ticket photos yet.</div>') + '</div></section>';
  }
  function paint() {
    const node = document.getElementById('d4TicketGallery');
    if (!node || node.dataset.tripId !== selectedTrip) return;
    currentNode = node;
    node.innerHTML = '<div class="d4-tkt-intro"><span>🎟️ Ticket Photo Gallery</span><p>Add as many ticket photos as you need, anytime. Each upload is saved separately.</p></div>' +
      '<div class="d4-tkt-sections">' + group('up') + group('down') + '</div>' +
      '<div class="d4-tkt-footer">' + (shared()
        ? '🔒 Shared trip: photos are stored securely for approved members. Only admins can make changes.'
        : '📱 Private trip: photos stay in this browser on this device. Exported JSON backups do not include image files.') +
      '</div>' + (message ? '<div class="d4-tkt-status" role="status">' + escapeText(message) + '</div>' : '');
    node.querySelectorAll('[data-tkt-image]').forEach(img => {
      const url = urls.get(img.dataset.tktImage);
      if (url) { img.src = url; img.hidden = false; img.previousElementSibling.hidden = true; }
    });
    for (const ticket of tickets) void loadPreview(ticket, selectedTrip);
  }
  async function loadPreview(ticket, id) {
    if (urls.has(ticket.id) || pending.has(ticket.id)) return;
    if (shared() && !cloud) return;
    pending.add(ticket.id);
    const generation = sequence;
    try {
      const blob = shared() ? await cloud.read(id, ticket) : await photoStore(id + ':' + ticket.id, 'get');
      if (!(blob instanceof Blob)) return;
      const url = URL.createObjectURL(blob);
      if (generation !== sequence || id !== selectedTrip || !tickets.some(x => x.id === ticket.id)) {
        URL.revokeObjectURL(url); return;
      }
      urls.set(ticket.id, url);
      document.querySelectorAll('[data-tkt-image]').forEach(img => {
        if (img.dataset.tktImage !== ticket.id) return;
        img.src = url; img.hidden = false; img.previousElementSibling.hidden = true;
      });
    } catch (error) {
      if (generation === sequence) { message = 'Some ticket images could not load: ' + error.message; showMessage(); }
    } finally { pending.delete(ticket.id); }
  }
  function showMessage() {
    const node = document.getElementById('d4TicketGallery');
    const line = node?.querySelector('.d4-tkt-status');
    if (line) line.textContent = message;
    else if (node && message) node.insertAdjacentHTML('beforeend','<div class="d4-tkt-status" role="status">' + escapeText(message) + '</div>');
  }
  function startShared() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (!selectedTrip || !shared()) return;
    if (!cloud) { message = 'Connecting to secure shared ticket photos…'; paint(); return; }
    const id = selectedTrip, generation = sequence;
    message = 'Loading shared ticket photos…'; paint();
    unsubscribe = cloud.watch(id, items => {
      if (generation !== sequence || selectedTrip !== id) return;
      const keep = new Set(items.map(x => x.id));
      for (const [key, url] of urls) if (!keep.has(key)) { URL.revokeObjectURL(url); urls.delete(key); }
      tickets = items.slice().sort((a,b) => (Number(b.createdAt?.seconds || b.createdAt || 0) - Number(a.createdAt?.seconds || a.createdAt || 0)));
      message = ''; paint();
    }, error => { if (generation === sequence) { message = 'Shared photo sync failed: ' + error.message; showMessage(); } });
  }
  function mount() {
    const node = document.getElementById('d4TicketGallery');
    if (!node) { if (selectedTrip) release(); return; }
    const id = node.dataset.tripId;
    if (!id || local?.currentTrip?.()?.id !== id) return;
    const changed = id !== selectedTrip;
    if (changed) {
      release(); selectedTrip = id;
      if (shared()) startShared();
      else { tickets = readList(id); message = ''; }
    }
    if (changed || currentNode !== node) paint();
  }
  async function upload(direction, files) {
    if (!editable()) throw new Error('Only Main Admin and Trip Admin can add tickets');
    if (busy) return;
    if (shared() && !cloud) throw new Error('Shared Firebase photo storage is not connected');
    const id = selectedTrip, items = Array.from(files || []);
    if (!items.length) return;
    if (!/^(up|down)$/.test(direction)) throw new Error('Choose Up or Down tickets');
    busy = true;
    let count = 0;
    try {
      for (const file of items) {
        if (id !== selectedTrip || !editable()) throw new Error('Trip access changed. Remaining uploads were stopped');
        if (!file.type.startsWith('image/')) throw new Error('Ticket photos must be image files');
        if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('Each ticket photo must be under 15 MB');
        if (shared()) await cloud.upload(id, direction, file);
        else {
          const entry = {id: (crypto.randomUUID?.() || String(Date.now()) + Math.random()), direction,
            name: file.name.slice(0, 120), size: file.size, type: file.type, createdAt: Date.now()};
          await photoStore(id + ':' + entry.id, 'put', file);
          try {
            saveList(id, [entry, ...tickets]);
          } catch (error) {
            await photoStore(id + ':' + entry.id, 'delete');
            throw error;
          }
          tickets.unshift(entry);
        }
        count++;
        message = 'Saved ' + count + ' of ' + items.length + ' ticket photos'; paint();
      }
      message = '✅ ' + count + ' ticket photo' + (count === 1 ? '' : 's') + ' added. You can add more anytime.';
    } catch (error) {
      message = (count ? count + ' saved. ' : '') + '⚠️ ' + error.message;
    } finally { busy = false; paint(); }
  }
  async function remove(id) {
    if (!editable() || busy) return;
    const ticket = tickets.find(x => x.id === id);
    if (!ticket || !confirm('Delete this ' + ticket.direction.toUpperCase() + ' ticket photo?')) return;
    busy = true;
    try {
      if (shared()) {
        if (!cloud) throw new Error('Shared Firebase photo storage is not connected');
        await cloud.remove(selectedTrip, ticket);
      } else {
        const next = tickets.filter(x => x.id !== id);
        saveList(selectedTrip, next);
        tickets = next;
        await photoStore(selectedTrip + ':' + id, 'delete');
      }
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      message = 'Ticket photo deleted';
    } catch (error) { message = 'Delete failed: ' + error.message; }
    finally { busy = false; paint(); }
  }
  async function openPhoto(id) {
    const ticket = tickets.find(x => x.id === id);
    if (!ticket) return;
    if (!urls.has(id)) await loadPreview(ticket, selectedTrip);
    if (!urls.has(id)) { message = 'Photo preview is not available'; showMessage(); return; }
    document.getElementById('d4TktLightbox')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'd4TktLightbox'; overlay.className = 'd4-tkt-lightbox';
    overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Ticket photo preview');
    const img = document.createElement('img'); img.src = urls.get(id); img.alt = ticket.name || 'Ticket';
    const close = document.createElement('button'); close.type = 'button';
    close.textContent = '✕ Close'; close.className = 'd4-tkt-lightbox-close'; close.dataset.tktClose = '';
    overlay.append(img,close); document.body.append(overlay); close.focus();
  }
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-tkt-add],[data-tkt-delete],[data-tkt-open],[data-tkt-close]');
    if (!btn) { if (event.target.id === 'd4TktLightbox') event.target.remove(); return; }
    event.preventDefault(); event.stopPropagation();
    if (btn.hasAttribute('data-tkt-close')) { document.getElementById('d4TktLightbox')?.remove(); return; }
    if (btn.hasAttribute('data-tkt-add')) {
      if (!editable() || busy) return;
      document.querySelectorAll('[data-tkt-input]').forEach(input => {
        if (input.dataset.tktInput === btn.dataset.tktAdd) input.click();
      }); return;
    }
    if (btn.hasAttribute('data-tkt-delete')) void remove(btn.dataset.tktDelete);
    if (btn.hasAttribute('data-tkt-open')) void openPhoto(btn.dataset.tktOpen);
  }, true);
  document.addEventListener('change', event => {
    const input = event.target.closest('[data-tkt-input]');
    if (!input) return;
    const files = Array.from(input.files || []);
    input.value = '';
    void upload(input.dataset.tktInput, files).catch(error => { message = error.message; showMessage(); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.getElementById('d4TktLightbox')?.remove();
  });
  window.D4Tickets = {mount, registerCloud(adapter) {cloud = adapter; if (selectedTrip && shared()) startShared(); },
    _testing: {readList, escapeText}};
  mount();
})();