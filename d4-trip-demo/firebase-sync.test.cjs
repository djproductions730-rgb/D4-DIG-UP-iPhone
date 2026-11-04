'use strict';
// Deterministic bridge regression tests; Firebase/network calls are mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const LINK = 'd4_trip_firebase_linked_uid_v1';
const DIRTY = 'd4_trip_firebase_dirty_uid_v1';
const dataset = name => ({ trips: [{ id: 'trip', name, members: [], expenses: [], chats: {} }] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function harness(initial = {}) {
  const storage = new Map(Object.entries(initial)), timers = new Map(), writes = [], listeners = [];
  let resetHandler = async () => {}, email = '', click;
  const resetCalls = [];
  let authChanged, transaction, timerId = 0, restores = 0, data = dataset('local');
  const window = {
    D4_TRIP_FIREBASE_CONFIG: { apiKey: 'test', authDomain: 'test', projectId: 'test', appId: 'test' },
    D4TripLocal: { getData: () => structuredClone(data), setData: value => { restores++; data = value; }, view: () => 'home' }
  };
  const context = vm.createContext({
    window, TextEncoder, confirm: () => true,
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    document: { addEventListener: (_event, fn) => { click = fn; }, getElementById: id => id === 'd4-cloud-email' ? {value:email} : {value:''} },
    sendPasswordResetEmail: async (auth, address) => { resetCalls.push(address); await resetHandler(); },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    initializeApp: () => ({}), getAuth: () => ({}), getFirestore: () => ({}),
    setPersistence: async () => {}, browserLocalPersistence: {},
    onAuthStateChanged: (_auth, fn) => { authChanged = fn; },
    doc: (_db, ...parts) => parts.join('/'),
    onSnapshot: (ref, _options, next, error) => { listeners.push({ref,next,error}); return () => {}; },
    runTransaction: (_db, fn) => transaction(fn), serverTimestamp: () => 'server-time'
  });
  const source = fs.readFileSync(path.join(__dirname, 'firebase-sync.js'), 'utf8')
    .replace(/import\s+[\s\S]*?from\s+'[^']+';/g, '');
  await vm.runInContext('(async () => {\n' + source + '\nwindow.testAPI = {flush, uploadFirst, restoreCloud, resetPassword}; })()', context);
  const snapshot = (remote = null, metadata = {}) => listeners.at(-1).next({
    exists: () => remote !== null, data: () => remote,
    metadata: { fromCache: false, hasPendingWrites: false, ...metadata }
  });
  return {
    resetCalls, setEmail: value => { email = value; }, setResetHandler: fn => { resetHandler = fn; },
    clickReset: () => click({target:{closest:()=>({dataset:{cloudAction:'reset-password'}})},preventDefault(){}}),
    bridge: window.D4TripCloud, api: window.testAPI, storage, timers, writes, listeners,
    signIn: uid => authChanged(uid ? {uid} : null), snapshot,
    get restores() { return restores; },
    edit() { data = dataset('edited'); window.D4TripCloud.localChanged(); },
    setTransaction: fn => { transaction = fn; },
    tx: (revision = 0) => ({get: async () => ({exists: () => revision > 0, data: () => ({revision})}), set: (ref, value) => writes.push({ref,value})})
  };
}

test('first upload waits for server, ignoring cached absence', async () => {
  const h = await harness(); h.signIn('A');
  h.snapshot(null, {fromCache:true});
  await h.api.uploadFirst();
  assert.equal(h.bridge.serverReady, false);
  assert.equal(h.writes.length, 0);
  assert.match(h.bridge.panel(), /Waiting for a confirmed/);
});

test('startup edits survive automatic reconnect', async () => {
  const h = await harness({[LINK]:'A'});
  h.edit(); h.signIn('A'); h.snapshot({revision:2, data:dataset('cloud')});
  assert.equal(h.storage.get(DIRTY), 'A');
  assert.equal(h.restores, 0);
  assert.equal(h.bridge.linked, false);
  assert.match(h.bridge.status, /Unsynced/);
});

test('clean reload reconnects to the same account', async () => {
  const h = await harness({[LINK]:'A'});
  h.signIn('A'); h.snapshot({revision:2, data:dataset('cloud')});
  assert.equal(h.restores, 1); assert.equal(h.bridge.linked, true);
  assert.equal(h.bridge.revision, 2);
});

test('transaction retry cannot redirect an old write to another account', async () => {
  const h = await harness(); h.signIn('A'); h.snapshot();
  const pause = deferred(), started = deferred();
  h.setTransaction(async fn => { await fn(h.tx()); started.resolve(); await pause.promise; return fn(h.tx()); });
  const pending = h.api.uploadFirst(); await started.promise;
  h.signIn('B'); pause.resolve(); await pending;
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].ref, 'users/A/snapshots/primary');
  assert.equal(h.bridge.linked, false);
  assert.equal(h.bridge.error, '');
  assert.equal(h.storage.has(LINK), false);
});

test('old upload completion cannot link a new session, including same UID', async () => {
  const h = await harness(); h.signIn('A'); h.snapshot();
  const pause = deferred(), started = deferred();
  h.setTransaction(async fn => { await fn(h.tx()); started.resolve(); await pause.promise; });
  const pending = h.api.uploadFirst(); await started.promise;
  h.signIn(null); h.signIn('A'); pause.resolve(); await pending;
  assert.equal(h.bridge.linked, false); assert.equal(h.bridge.revision, 0);
  assert.equal(h.storage.has(LINK), false);
});

test('edits during initial upload remain dirty and queue the next revision', async () => {
  const h = await harness(); h.signIn('A'); h.snapshot();
  const pause = deferred(), started = deferred();
  h.setTransaction(async fn => { await fn(h.tx()); started.resolve(); await pause.promise; });
  const pending = h.api.uploadFirst(); await started.promise;
  h.edit(); pause.resolve(); await pending;
  assert.equal(h.bridge.dirty, true); assert.equal(h.storage.get(DIRTY), 'A');
  assert.equal(h.timers.size, 1);
  h.setTransaction(async fn => fn(h.tx(1)));
  await h.api.flush();
  assert.equal(h.bridge.revision, 2); assert.equal(h.bridge.dirty, false);
  assert.equal(h.writes.at(-1).value.data.trips[0].name, 'edited');
});

test('stale revision stops upload without overwriting cloud data', async () => {
  const h = await harness({[LINK]:'A'}); h.signIn('A');
  h.snapshot({revision:1, data:dataset('cloud')}); h.edit();
  h.setTransaction(async fn => fn(h.tx(2))); await h.api.flush();
  assert.equal(h.writes.length, 0); assert.equal(h.bridge.linked, false);
  assert.equal(h.storage.get(DIRTY), 'A'); assert.equal(h.bridge.dirty, true);
});

test('stale listener callbacks cannot modify the next account', async () => {
  const h = await harness(); h.signIn('A'); const old = h.listeners[0];
  h.signIn('B'); old.error(Error('old permission error'));
  old.next({metadata:{}, exists:()=>false});
  assert.equal(h.bridge.serverReady, false); assert.equal(h.bridge.error, '');
  assert.equal(h.bridge.user.uid, 'B');
});

test('forgot password is available without a signed-in role or password', async () => {
  const h = await harness(); h.signIn(null);
  assert.match(h.bridge.panel(), /Forgot password\?/);
  assert.match(h.bridge.panel(), /Admin &amp; Main Admin/);
  h.setEmail('  admin@example.com  '); await h.clickReset();
  assert.deepEqual(h.resetCalls, ['admin@example.com']);
  assert.match(h.bridge.resetMessage, /Check Inbox and Spam/);
  assert.equal(h.bridge.user, null); assert.equal(h.writes.length, 0);
});
test('reset rejects missing or invalid email without contacting Firebase', async () => {
  const h = await harness(); h.signIn(null);
  for (const email of ['', 'bad', 'a@b', 'a b@example.com']) {
    h.setEmail(email); await h.api.resetPassword();
    assert.match(h.bridge.error, /registered email/);
  }
  assert.equal(h.resetCalls.length, 0);
});
test('reset blocks duplicate requests while pending and escapes retained email', async () => {
  const h = await harness(); h.signIn(null);
  const pause = deferred(); h.setResetHandler(() => pause.promise);
  h.setEmail('admin@example.com'); const pending = h.api.resetPassword();
  await h.api.resetPassword();
  assert.equal(h.resetCalls.length, 1); assert.match(h.bridge.panel(), /disabled/);
  pause.resolve(); await pending; assert.equal(h.bridge.resetPending, false);
  h.bridge.resetEmail = '<script>'; assert.match(h.bridge.panel(), /&lt;script&gt;/);
});
test('reset hides account existence and recovers from network and rate errors', async () => {
  const h = await harness(); h.signIn(null); h.setEmail('admin@example.com');
  await h.api.resetPassword(); const success = h.bridge.resetMessage;
  for (const [code, pattern] of [
    ['auth/user-not-found', null],
    ['auth/network-request-failed', /internet connection/],
    ['auth/too-many-requests', /wait a few minutes/],
    ['auth/invalid-email', /valid registered email/],
    ['auth/internal-error', /Could not send/]
  ]) {
    h.setResetHandler(async () => { throw {code}; }); await h.api.resetPassword();
    if (pattern) { assert.match(h.bridge.error, pattern); assert.equal(h.bridge.resetMessage, ''); }
    else { assert.equal(h.bridge.resetMessage, success); assert.equal(h.bridge.error, ''); }
    assert.equal(h.bridge.resetPending, false); assert.equal(h.writes.length, 0);
  }
});
