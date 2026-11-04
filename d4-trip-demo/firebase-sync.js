/* D4 Trip Firebase bridge: opt-in, UID-private, same-account multi-device sync.
 * This is intentionally NOT shared-trip authorization. Demo role switches remain local
 * until a trusted UID->trip membership backend and invite redemption are deployed.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, sendEmailVerification, reload, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, doc, onSnapshot, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const LINK_KEY = 'd4_trip_firebase_linked_uid_v1';
const DIRTY_KEY = 'd4_trip_firebase_dirty_uid_v1';
const config = window.D4_TRIP_FIREBASE_CONFIG;
const configured = Boolean(config && typeof config === 'object' &&
  config.apiKey && config.authDomain && config.projectId && config.appId);
const bridge = {
  configured, user: null, linked: false, ready: false, remote: null,
  revision: 0, dirty: false, saving: false, sequence: 0, session: 0, serverReady: false,
  status: configured ? 'Waiting for sign in' : 'Firebase configuration not added',
  error: '', stop: null, timer: null, cloudDb: null, auth: null,
  localChanged, panel
};
const designatedOwner = '2FYUUnPp1JX8wvv9HSvL6QoyaCq2';
bridge.isVerifiedOwner = () => bridge.user?.uid === designatedOwner && bridge.user.emailVerified === true;
window.D4TripCloud = bridge;
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const local = () => window.D4TripLocal;
const refresh = () => {
  if (typeof local()?.render === 'function' &&
      ['profile','entry'].includes(local().view())) local().render();
};
const notify = s => local()?.toast?.(s);
const docRef = (uid = bridge.user.uid) => doc(bridge.cloudDb, 'users', uid, 'snapshots', 'primary');
const currentSession = (session, uid) => bridge.session === session && bridge.user?.uid === uid;
const validData = data => data && Array.isArray(data.trips) && data.trips.every(t =>
  t && typeof t.id === 'string' && typeof t.name === 'string' &&
  Array.isArray(t.members) && Array.isArray(t.expenses) && t.chats);
const bytes = data => new TextEncoder().encode(JSON.stringify(data)).byteLength;
const formatError = e => String(e?.message || e || 'Unknown Firebase error').slice(0,240);

function panel() {
  let rows = [
    '<section class="card" id="d4-cloud-panel" style="margin-bottom:16px">',
    '<h3>☁️ Firebase Cloud Sync <span class="pill">Private beta</span></h3>',
    '<p class="muted" style="font-size:13px">Sign in for private backup or open an invited team trip. Team access requires a verified email; local trip codes do not grant cloud access.</p>'
  ];
  if (!configured) {
    rows.push('<div class="notice">Firebase Web App config missing. Offline demo and existing backups continue working. Add the registered Web App config to <code>d4-trip-demo/firebase-config.js</code> after enabling Email/Password Authentication and deploying the matching Firestore security rules.</div>');
  } else if (!bridge.ready) {
    rows.push('<p class="muted">Connecting to Firebase Authentication…</p>');
  } else if (!bridge.user) {
    rows.push('<div class="field"><label for="d4-cloud-email">Email</label><input id="d4-cloud-email" class="input" type="email" autocomplete="username" placeholder="Email address"></div>');
    rows.push('<div class="field"><label for="d4-cloud-password">Password</label><input id="d4-cloud-password" class="input" type="password" autocomplete="current-password" placeholder="Password (at least 6 characters)"></div>');
    rows.push('<div class="row"><button type="button" class="btn small mint" data-cloud-action="sign-in">Sign in</button><button type="button" class="btn small ghost" data-cloud-action="sign-up">Create account</button></div>');
  } else {
    rows.push('<p>Signed in: <strong>' + safe(bridge.user.email || bridge.user.uid) + '</strong></p>');
    rows.push('<p class="muted" style="font-size:13px">Status: ' + safe(bridge.status) + '</p>');
    if (!bridge.user.emailVerified) {
      rows.push('<div class="notice">Verify your email to open invited trips.</div><button class="btn small mint" data-cloud-action="verify-email">Send verification email</button> <button class="btn small ghost" data-cloud-action="check-email">I verified my email</button>');
    }
    if (local()?.teamId) { rows.push('<p>Team trip access uses your verified email.</p>'); } else if (bridge.linked) {
      rows.push('<p class="tiny">Firestore real-time listener is active. Local changes are uploaded only to this account. Conflicting revisions are stopped, not overwritten.</p>');
    } else if (!bridge.serverReady) {
      rows.push('<p class="muted">Waiting for a confirmed cloud backup check. Upload and restore are unavailable until the server responds.</p>');
    } else if (bridge.remote) {
      rows.push('<div class="notice">Cloud backup found (revision ' + Number(bridge.remote.revision || 0) + '). Restore it to this device to start live sync. A JSON backup of current local data will download first.</div>');
      rows.push('<button type="button" class="btn small mint" data-cloud-action="restore">⬇ Restore cloud data & enable sync</button>');
    } else {
      rows.push('<div class="notice">No cloud backup found for this account. Your existing local demo is unchanged. Upload it only if this is the data you intend to sync.</div>');
      rows.push('<button type="button" class="btn small mint" data-cloud-action="upload-first">⬆ Upload this device data & enable sync</button>');
    }
    rows.push('<div class="row" style="margin-top:10px"><button type="button" class="btn small ghost" data-cloud-action="sign-out">Sign out</button></div>');
    rows.push('<p class="tiny">Signing out does not delete local device data. Photos/videos held in IndexedDB are device-only; metadata and inline attachments are limited by the Firestore document size.</p>');
  }
  rows.push('<div class="row" style="margin-top:10px"><button type="button" class="btn small ghost" data-cloud-action="backup">⬇ Download device JSON backup</button></div>');
  if (bridge.error) rows.push('<div class="notice" role="alert">⚠️ ' + safe(bridge.error) + '</div>');
  rows.push('</section>');
  return rows.join('');
}

function localChanged() {
  bridge.sequence += 1;
  // Protect edits made during Auth/server startup, before the listener relinks.
  const linkedUid = localStorage.getItem(LINK_KEY);
  if (linkedUid && (!bridge.user || bridge.user.uid === linkedUid)) {
    localStorage.setItem(DIRTY_KEY, linkedUid);
  }
  if (!bridge.linked || !bridge.user) return;
  bridge.dirty = true;
  localStorage.setItem(DIRTY_KEY, bridge.user.uid);
  bridge.status = 'Unsynced local edits (will retry)';
  if (bridge.timer) clearTimeout(bridge.timer);
  bridge.timer = setTimeout(flush, 450);
}

async function flush() {
  if (!bridge.linked || !bridge.user || !bridge.dirty || bridge.saving) return;
  bridge.saving = true;
  const session = bridge.session, uid = bridge.user.uid, ref = docRef(uid);
  const sentSequence = bridge.sequence;
  const expected = bridge.revision;
  const data = local()?.getData?.();
  if (!validData(data)) {
    bridge.status = 'Invalid local backup: upload stopped';
    bridge.saving = false; refresh(); return;
  }
  if (bytes(data) > 900000) {
    bridge.status = 'Cloud document too large; export JSON backup and reduce inline attachments';
    bridge.saving = false; refresh(); return;
  }
  try {
    const nextRevision = await runTransaction(bridge.cloudDb, async tx => {
      if (!currentSession(session, uid)) throw Error('Account changed; upload cancelled.');
      const snap = await tx.get(ref);
      if (!currentSession(session, uid)) throw Error('Account changed; upload cancelled.');
      const actual = snap.exists() ? snap.data().revision : 0;
      if (actual !== expected) throw Error('Cloud data changed on another device. Sync stopped to protect both versions.');
      const revision = actual + 1;
      tx.set(ref, { data, revision, updatedBy: uid, updatedAt: serverTimestamp() });
      return revision;
    });
    if (!currentSession(session, uid)) return;
    bridge.revision = nextRevision;
    if (bridge.sequence === sentSequence) {
      bridge.dirty = false;
      localStorage.removeItem(DIRTY_KEY);
      bridge.status = 'Synced — revision ' + nextRevision;
    } else {
      bridge.status = 'Uploading newer local edits';
    }
  } catch (e) {
    if (!currentSession(session, uid)) return;
    bridge.status = 'Sync stopped — local data is safe';
    bridge.error = formatError(e);
    bridge.linked = false; // Never overwrite a newer cloud version automatically.
  } finally {
    if (!currentSession(session, uid)) return;
    bridge.saving = false;
    refresh();
    if (bridge.linked && bridge.dirty) {
      bridge.timer = setTimeout(flush, 500);
    }
  }
}

function watchSnapshot(user) {
  if (bridge.stop) bridge.stop();
  const watchedUid = user.uid;
  const session = bridge.session;
  bridge.stop = onSnapshot(docRef(), { includeMetadataChanges: true }, snap => {
    if (!currentSession(session, watchedUid) || snap.metadata.hasPendingWrites) return;
    if (snap.metadata.fromCache) {
      if (!bridge.linked) bridge.status = 'Offline cache available; waiting for server';
      refresh(); return;
    }
    bridge.serverReady = true;
    bridge.remote = snap.exists() ? snap.data() : null;
    // Reconnect automatically after a normal reload, but never discard unsent local edits.
    const previouslyLinked = localStorage.getItem(LINK_KEY) === watchedUid;
    const pendingLocal = localStorage.getItem(DIRTY_KEY) === watchedUid;
    if (!bridge.linked && previouslyLinked && !pendingLocal &&
        bridge.remote && validData(bridge.remote.data)) {
      local()?.setData?.(bridge.remote.data);
      bridge.revision = Number(bridge.remote.revision) || 0;
      bridge.linked = true;
      bridge.status = 'Live sync reconnected';
    }
    if (!bridge.linked) {
      bridge.status = pendingLocal ? 'Unsynced device changes — export a backup before restoring' :
        bridge.remote ? 'Cloud backup available' : 'Cloud backup not yet created';
      refresh(); return;
    }
    const incomingRevision = Number(bridge.remote?.revision || 0);
    if (bridge.saving || incomingRevision <= bridge.revision) return;
    if (bridge.dirty) {
      bridge.linked = false;
      bridge.error = 'Remote changes detected while local edits were pending. Both copies were preserved; export the local backup before restoring cloud data.';
      bridge.status = 'Conflict — syncing paused';
      refresh(); return;
    }
    if (!validData(bridge.remote.data)) {
      bridge.linked = false;
      bridge.status = 'Cloud data invalid; syncing paused';
      refresh(); return;
    }
    local()?.setData?.(bridge.remote.data);
    bridge.revision = incomingRevision;
    bridge.status = 'Updated live from another device';
    refresh();
  }, err => {
    if (!currentSession(session, watchedUid)) return;
    bridge.serverReady = false;
    bridge.linked = false;
    bridge.status = 'Cloud listener unavailable';
    bridge.error = formatError(err);
    refresh();
  });
}

async function signIn(mode) {
  const email = document.getElementById('d4-cloud-email')?.value?.trim();
  const password = document.getElementById('d4-cloud-password')?.value || '';
  if (!email || password.length < 6) {
    bridge.error = 'Enter a valid email and a password with at least 6 characters.';
    refresh(); return;
  }
  bridge.error = '';
  try {
    if (mode === 'sign-up') await createUserWithEmailAndPassword(bridge.auth, email, password);
    else await signInWithEmailAndPassword(bridge.auth, email, password);
  } catch (e) {
    bridge.error = formatError(e);
    refresh();
  }
}

async function restoreCloud() {
  if(local()?.teamId)return;
  if (bridge.saving) return;
  if (!bridge.user || !bridge.serverReady || !bridge.remote || !validData(bridge.remote.data)) {
    bridge.error = 'Valid cloud backup is not available.'; refresh(); return;
  }
  if (!confirm('A D4 Trip local JSON backup will download first. Then replace the current on-device trip data with the cloud version?')) return;
  try {
    local()?.backup?.();
    local()?.setData?.(bridge.remote.data);
    bridge.revision = Number(bridge.remote.revision) || 0;
    bridge.dirty = false;
    bridge.error = '';
    bridge.linked = true;
    localStorage.setItem(LINK_KEY, bridge.user.uid);
    localStorage.removeItem(DIRTY_KEY);
    bridge.status = 'Live sync enabled (revision ' + bridge.revision + ')';
    refresh(); notify('☁️ Cloud data restored; live sync enabled');
  } catch (e) { bridge.error = formatError(e); refresh(); }
}

async function uploadFirst() {
  if(local()?.teamId)return;
  if (!bridge.user || !bridge.serverReady || bridge.remote || bridge.saving) return;
  if (!confirm('Upload ALL current on-device D4 Trip data (including demo sample trips) to this account? Your local data stays here.')) return;
  const data = local()?.getData?.();
  if (!validData(data)) { bridge.error = 'Invalid local dataset'; refresh(); return; }
  if (bytes(data) > 900000) {
    bridge.error = 'Local dataset exceeds safe Firestore size (900 KB). Export JSON backup; reduce embedded bills.';
    refresh(); return;
  }
  const session = bridge.session, uid = bridge.user.uid, ref = docRef(uid);
  const sentSequence = bridge.sequence;
  bridge.saving = true;
  try {
    await runTransaction(bridge.cloudDb, async tx => {
      if (!currentSession(session, uid)) throw Error('Account changed; upload cancelled.');
      const snap = await tx.get(ref);
      if (!currentSession(session, uid)) throw Error('Account changed; upload cancelled.');
      if (snap.exists()) throw Error('Cloud backup was created on another device. Upload refused.');
      tx.set(ref, { data, revision: 1, updatedAt: serverTimestamp(), updatedBy: uid });
    });
    if (!currentSession(session, uid)) return;
    bridge.revision = 1;
    bridge.linked = true;
    localStorage.setItem(LINK_KEY, uid);
    bridge.dirty = bridge.sequence !== sentSequence;
    if (bridge.dirty) localStorage.setItem(DIRTY_KEY, uid);
    else localStorage.removeItem(DIRTY_KEY);
    bridge.error = '';
    bridge.status = 'Live sync enabled (revision 1)';
    refresh(); notify('☁️ Initial cloud backup saved');
  } catch (e) {
    if (currentSession(session, uid)) { bridge.error = formatError(e); refresh(); }
  } finally {
    if (currentSession(session, uid)) {
      bridge.saving = false;
      if (bridge.linked && bridge.dirty) bridge.timer = setTimeout(flush, 450);
    }
  }
}

document.addEventListener('click', async event => {
  const action = event.target.closest('[data-cloud-action]')?.dataset.cloudAction;
  if (!action || !bridge.configured) return;
  event.preventDefault();
  if (action === 'sign-in' || action === 'sign-up') await signIn(action);
  if (action === 'verify-email' || action === 'check-email') {
    const user = bridge.auth?.currentUser;
    if (!user) return;
    try {
      if (action === 'verify-email') { await sendEmailVerification(user); notify('Verification email sent. Open the link in your inbox.'); }
      else { await reload(user); await user.getIdToken(true); if (bridge.auth.currentUser === user) { bridge.user=user; window.dispatchEvent?.(new Event('d4-auth')); notify(user.emailVerified?'Email verified. D can now add a trip.':'Email verification is still pending.'); } }
    } catch (e) { bridge.error=formatError(e); }
    refresh();
  }
  if (action === 'backup') {
    try { local()?.backup?.(); notify('Local D4 Trip backup download requested'); }
    catch (e) { bridge.error = formatError(e); refresh(); }
  }
  if (action === 'sign-out') {
    if (!confirm('Sign out of Firebase? Your trip data will stay on this browser and may still be visible to others using this device. Download a backup if needed.')) return;
    try { await signOut(bridge.auth); localStorage.removeItem(LINK_KEY); }
    catch (e) { bridge.error = formatError(e); refresh(); }
  }
  if (action === 'restore') await restoreCloud();
  if (action === 'upload-first') await uploadFirst();
});

if (configured) {
  try {
    const app = initializeApp(config, 'd4-trip');
    bridge.auth = getAuth(app);
    bridge.cloudDb = getFirestore(app);
    await setPersistence(bridge.auth, browserLocalPersistence);
    onAuthStateChanged(bridge.auth, user => {
      bridge.session += 1;
      if (bridge.stop) { bridge.stop(); bridge.stop = null; }
      if (bridge.timer) clearTimeout(bridge.timer);
      bridge.user = user;
      bridge.remote = null;
      bridge.serverReady = false;
      bridge.linked = false;
      bridge.dirty = false;
      bridge.saving = false;
      bridge.revision = 0;
      bridge.error = '';
      bridge.status = user ? 'Checking cloud backup' : 'Signed out';
      bridge.ready = true;
      if (user && !local()?.teamId) watchSnapshot(user);
      window.dispatchEvent?.(new Event('d4-auth'));
      local()?.render?.();
    }, err => { bridge.error = formatError(err); bridge.ready = true; refresh(); });
  } catch (e) { bridge.error = formatError(e); bridge.ready = true; refresh(); }
} else { bridge.ready = true; refresh(); }
