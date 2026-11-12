/* D4 Trip shared-trip live chat. Messages are kept in separate Firestore
 * subcollections so editing a trip never overwrites chat history. */
import {
  collection, doc, getDoc, addDoc, deleteDoc, onSnapshot, orderBy, query, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const local = window.D4TripLocal;
const cloud = () => window.D4TripCloud;
const authUser = () => cloud()?.auth?.currentUser;
const canEdit = () => window.D4Team?.canEdit?.() === true;
const permitted = () => Boolean(
  local?.teamId && cloud()?.cloudDb && authUser() &&
  window.D4Team?.hasAccess?.() && local.currentTrip()?.id === local.teamId
);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const messagesRef = room => collection(cloud().cloudDb, 'teamTrips', local.teamId, 'chats', room, 'messages');
const requestedRoom = new URLSearchParams(location.search).get('chat');
let room = ['admins','announcements'].includes(requestedRoom) ? requestedRoom : 'group', watcher = null, watchKey = '', items = [], error = '', loading = false;
let sending = false, replyTo = '';

function reset() {
  if (watcher) watcher();
  watcher = null; watchKey = ''; items = []; error = ''; loading = false; replyTo = '';
}
function dateLabel(value) {
  const date = value?.toDate?.();
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-IN', {day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})
    : 'Sending…';
}
function messageText(value) {
  return escapeHtml(value).replace(/\n/g, '<span class="d4lc-break"></span>');
}
function messagesHtml() {
  if (error) return '<div class="d4lc-feedback" role="alert">⚠️ ' + escapeHtml(error) + '</div>';
  if (loading && !items.length) return '<div class="d4lc-feedback" role="status">Loading messages…</div>';
  if (!items.length) return '<div class="d4lc-empty">💬<strong>No messages yet</strong><span>Start your trip conversation!</span></div>';
  const me = authUser()?.uid;
  return items.map(msg => {
    const mine = msg.senderUid === me;
    const replied = msg.replyTo && items.find(x => x.id === msg.replyTo);
    return '<article class="d4lc-bubble ' + (mine?'mine':'') + '">' +
      '<div class="d4lc-person">' + escapeHtml(mine?'You':msg.senderName||'Trip member') +
      '<time>' + escapeHtml(dateLabel(msg.createdAt)) + '</time></div>' +
      (replied?'<div class="d4lc-quoted">↪ ' + escapeHtml(replied.senderName) + ': ' +
         escapeHtml(String(replied.text||'').slice(0,95)) + '</div>':'') +
      '<p>' + messageText(msg.text) + '</p>' +
      '<div class="d4lc-actions"><button type="button" data-d4lc-reply="' + escapeHtml(msg.id) +
      '" aria-label="Reply to message">↩ Reply</button>' +
      (mine || cloud()?.isVerifiedOwner?.() ? '<button type="button" data-d4lc-delete="' +
       escapeHtml(msg.id) + '" aria-label="Delete message">Delete</button>' : '') +
      '</div></article>';
  }).join('');
}
function paintStream() {
  const host = document.getElementById('d4lc-stream');
  if (!host) return;
  const nearBottom = host.scrollHeight - host.scrollTop - host.clientHeight < 110;
  host.innerHTML = messagesHtml();
  if (nearBottom) host.scrollTop = host.scrollHeight;
}
function subscribe() {
  if (!permitted()) { reset(); return; }
  if (room === 'admins' && !canEdit()) room = 'group';
  const key = local.teamId + ':' + authUser().uid + ':' + room;
  if (key === watchKey) return;
  reset();
  watchKey = key; loading = true;
  try {
    watcher = onSnapshot(query(messagesRef(room), orderBy('createdAt','desc'), limit(100)), snap => {
      if (watchKey !== key) return;
      items = snap.docs.map(s => ({id:s.id, ...s.data()})).reverse();
      error = ''; loading = false; paintStream();
    }, err => {
      if (watchKey !== key) return;
      loading = false; error = 'Cannot read this room. Check your trip access. ' + (err?.message||'');
      paintStream();
    });
  } catch (err) { loading = false; error = err.message || 'Chat unavailable'; }
}
function page() {
  if (!local?.teamId) return '<section class="card d4lc-info"><h2>💬 Live Trip Chat</h2>' +
    '<p>Open an approved shared trip to chat across phones. Device-only trips cannot live-sync.</p>' + (cloud()?.isVerifiedOwner?.() ? '<button type="button" class="btn" data-team="open-shared">Open shared trip</button>' : '') + '</section>';
  if (!permitted()) {
    reset();
    return '<section class="card d4lc-info"><h2>🔒 Trip Chat</h2>' +
      '<p>Sign in and join this trip, or wait for Main Admin to approve your access.</p></section>';
  }
  subscribe();
  const admin = canEdit();
  return '<section class="d4lc-shell" aria-label="Live trip chat">' +
    '<div class="d4lc-head"><div><small>💬 D4 TRIP · REAL-TIME</small><h2>' +
    escapeHtml(local.currentTrip()?.name || 'Trip') + ' Chat</h2></div><span>🔒 Private</span></div>' +
    '<div class="d4lc-rooms" role="tablist" aria-label="Chat rooms">' +
      '<button type="button" role="tab" aria-selected="' + (room==='group') +
      '" class="' + (room==='group'?'active':'') + '" data-d4lc-room="group">👥 Group Chat</button>' +
      (admin ? '<button type="button" role="tab" aria-selected="' + (room==='admins') +
      '" class="' + (room==='admins'?'active':'') + '" data-d4lc-room="admins">🛡️ Admin Chat</button>' : '') +
    '<button type="button" role="tab" aria-selected="'+(room==='announcements')+'" class="'+(room==='announcements'?'active':'')+'" data-d4lc-room="announcements">📣 Announcements</button>' +
    '</div><button type="button" class="btn small" data-trip-push>🔔 Enable trip notifications</button><div id="d4lc-stream" class="d4lc-stream" role="log" aria-live="polite" aria-relevant="additions text">' +
    messagesHtml() + '</div>' +
    (room==='announcements' && !admin ? '<p>Announcements from your trip admins appear here.</p></section>' :
    '<form id="d4lc-form" class="d4lc-form">' +
      '<div id="d4lc-reply" class="d4lc-reply" ' + (replyTo?'':'hidden') + '>' +
      '↩ Replying to a message <button type="button" data-d4lc-cancel aria-label="Cancel reply">✕</button></div>' +
      '<label for="d4lc-text" class="d4lc-label">Message</label>' +
      '<div class="d4lc-compose"><textarea id="d4lc-text" name="message" required maxlength="2000" ' +
      'rows="2" placeholder="Type your message…" aria-label="Chat message"></textarea>' +
      '<button type="submit" class="d4lc-send" ' + (sending?'disabled':'') +
      ' aria-label="Send message">Send ➤</button></div>' +
      '<small>Only approved trip members can see Group Chat. Admin Chat is private to admins.</small>' +
    '</form></section>');
}
async function senderName() {
  const user = authUser();
  if (!user) throw Error('Sign in again to send.');
  if (cloud()?.isVerifiedOwner?.()) return 'Main Admin';
  const snap = await getDoc(doc(cloud().cloudDb, 'teamTrips', local.teamId, 'accessUid', user.uid));
  if (snap.exists() && ['member','admin'].includes(snap.data().role)) {
    const name = String(snap.data().name||'').trim();
    if (name.length >= 2 && name.length <= 70) return name;
  }
  if (user.emailVerified && user.email) return user.email.toLowerCase();
  throw Error('Approved trip access is required.');
}
document.addEventListener('click', async event => {
  const tab = event.target.closest('[data-d4lc-room]');
  if (tab) {
    const next = tab.dataset.d4lcRoom;
    if (!['group','announcements'].includes(next) && (next !== 'admins' || !canEdit())) return;
    room = next; reset();
    local.render(); return;
  }
  if (event.target.closest('[data-d4lc-cancel]')) {
    replyTo = ''; document.getElementById('d4lc-reply')?.setAttribute('hidden',''); return;
  }
  const quote = event.target.closest('[data-d4lc-reply]');
  if (quote) {
    if (!items.some(m => m.id === quote.dataset.d4lcReply)) return;
    replyTo = quote.dataset.d4lcReply;
    document.getElementById('d4lc-reply')?.removeAttribute('hidden');
    document.getElementById('d4lc-text')?.focus(); return;
  }
  const button = event.target.closest('[data-d4lc-delete]');
  if (!button || !permitted()) return;
  const msg = items.find(m => m.id === button.dataset.d4lcDelete);
  if (!msg || !(msg.senderUid === authUser()?.uid || cloud()?.isVerifiedOwner?.())) return;
  if (!confirm('Delete this message for everyone in this trip room?')) return;
  try {
    await deleteDoc(doc(messagesRef(room),msg.id));
    local.toast('Message deleted');
  } catch (err) { local.toast('Could not delete: ' + (err.message||err)); }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'd4lc-form') return;
  event.preventDefault();
  if (sending) return;
  if (!permitted() || (room !== 'group' && !canEdit())) return local.toast('Chat access denied');
  const input = event.target.querySelector('[name="message"]');
  const text = String(input?.value||'').trim();
  if (!text || text.length > 2000) return local.toast('Write a message (max 2,000 characters)');
  if (navigator.onLine === false) return local.toast('Connect to the internet to send a message');
  sending = true;
  const sendButton = event.target.querySelector('[type="submit"]');
  if (sendButton) { sendButton.disabled = true; sendButton.textContent = 'Sending…'; }
  try {
    const name = await senderName();
    if (!permitted()) throw Error('Trip access changed. Please reopen chat.');
    const message = {senderUid:authUser().uid,senderName:name,text,createdAt:serverTimestamp()};
    if (replyTo && items.some(m => m.id === replyTo)) message.replyTo = replyTo;
    await addDoc(messagesRef(room), message);
    replyTo = ''; if (input) input.value = '';
    document.getElementById('d4lc-reply')?.setAttribute('hidden','');
    const host = document.getElementById('d4lc-stream');
    if (host) host.scrollTop = host.scrollHeight;
  } catch (err) { local.toast('Message not sent: ' + (err.message||err)); }
  finally {
    sending = false;
    if (sendButton?.isConnected) { sendButton.disabled = false; sendButton.textContent = 'Send ➤'; }
  }
});
window.addEventListener('d4-auth', () => { reset(); if (local?.view?.() === 'chat') local.render(); });
window.D4LiveChat = {page, reset};
if (local?.view?.() === 'chat') local.render();
