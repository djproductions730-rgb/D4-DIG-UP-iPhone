const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {createHash} = require('node:crypto');
const push = require('web-push');
initializeApp();
const db = getFirestore();
const owner = '2FYUUnPp1JX8wvv9HSvL6QoyaCq2';

async function role(trip, uid) {
  let user;
  try { user = await getAuth().getUser(uid); }
  catch (e) { if (e.code === 'auth/user-not-found') return null; throw e; }
  if (user.disabled) return null;
  if (uid === owner && user.emailVerified) return 'admin';
  const grants = [trip.collection('accessUid').doc(uid)];
  if (user.emailVerified && user.email && !user.email.includes('/')) grants.push(trip.collection('access').doc(user.email.toLowerCase()));
  const roles = (await db.getAll(...grants)).map(doc => doc.get('role'));
  return roles.includes('admin') ? 'admin' : roles.includes('member') ? 'member' : null;
}

function keys() {
  const ref = db.doc('privatePushConfig/vapid');
  return db.runTransaction(async tx => {
    const current = await tx.get(ref);
    if (current.exists) return current.data();
    const pair = push.generateVAPIDKeys();
    tx.create(ref, pair);
    return pair;
  });
}

exports.tripPushRegistration = onCall(async request => {
  const {tripId, subscription} = request.data || {};
  if (!request.auth || typeof tripId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(tripId)) throw new HttpsError('permission-denied','Open an approved trip first.');
  const trip = db.collection('teamTrips').doc(tripId);
  if (!(await trip.get()).exists || !await role(trip, request.auth.uid)) throw new HttpsError('permission-denied','Trip access required.');
  const pair = await keys();
  if (!subscription) return {publicKey:pair.publicKey};
  const url = new URL(subscription.endpoint);
  const hosts = /^(?:fcm\.googleapis\.com|(?:[a-z0-9-]+\.)*push\.apple\.com|(?:[a-z0-9-]+\.)*push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)*notify\.windows\.com)$/;
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !hosts.test(url.hostname) ||
      !/^[\w-]{87}$/.test(subscription.keys?.p256dh || '') || !/^[\w-]{22}$/.test(subscription.keys?.auth || ''))
    throw new HttpsError('invalid-argument','Invalid device subscription.');
  const id = createHash('sha256').update(url.href).digest('hex');
  await trip.collection('pushDevices').doc(id).set({uid:request.auth.uid, endpoint:url.href, keys:{p256dh:subscription.keys.p256dh,auth:subscription.keys.auth}});
  return {enabled:true};
});

exports.tripMessagePush = onDocumentCreated({document:'teamTrips/{tripId}/chats/{room}/messages/{messageId}',retry:true},async event => {
  const {tripId,room,messageId} = event.params;
  if (!['group','admins','announcements'].includes(room)) return;
  const trip = db.collection('teamTrips').doc(tripId);
  if (!(await trip.get()).exists) return;
  const message = event.data.data();
  const devices = await trip.collection('pushDevices').get();
  const pair = await keys();
  for (const device of devices.docs) {
    const {uid,endpoint,keys:subscriptionKeys} = device.data();
    if (uid === message.senderUid && room !== 'announcements') continue;
    const recipientRole = await role(trip,uid);
    if (!recipientRole || (room === 'admins' && recipientRole !== 'admin')) continue;
    try {
      await push.sendNotification({endpoint,keys:subscriptionKeys}, JSON.stringify({tripId,room,messageId,title:room==='announcements'?'D4 Trip · Announcement':'D4 Trip · '+(room==='admins'?'Admin Chat':'Group Chat'), body:String(message.text).slice(0,220)}), {TTL:86400,vapidDetails:{subject:'https://d4-trip.web.app',...pair}});
    } catch(e) {
      if ([404,410].includes(e.statusCode)) await device.ref.delete({lastUpdateTime:device.updateTime});
      else throw e;
    }
  }
});
