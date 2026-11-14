/* Authenticated Firebase photo adapter for D4 Trip shared Up/Down ticket galleries. */
import {getApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {collection,doc,onSnapshot,setDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {getStorage,ref as storageRef,uploadBytes,getBlob,deleteObject} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js';

function context(tripId) {
  const bridge = window.D4TripCloud;
  if (!bridge?.cloudDb || !bridge?.auth?.currentUser) throw Error('Sign in to view shared ticket photos');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(tripId)) throw Error('Invalid trip ID');
  return {db:bridge.cloudDb,user:bridge.auth.currentUser,storage:getStorage(getApp('d4-trip'))};
}
function photoDoc(db,tripId,ticketId) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(ticketId)) throw Error('Invalid ticket ID');
  return doc(db,'teamTrips',tripId,'ticketPhotos',ticketId);
}
function imagePath(tripId,ticket) {
  if (!/^(up|down)$/.test(ticket.direction) || !/^[A-Za-z0-9_-]{1,100}$/.test(ticket.id)) throw Error('Invalid ticket record');
  const expected = 'tripTickets/' + tripId + '/' + ticket.direction + '/' + ticket.id;
  if (ticket.storagePath !== expected) throw Error('Ticket path mismatch');
  return expected;
}
const adapter = {
  watch(tripId, onData, onError) {
    try {
      const {db} = context(tripId);
      return onSnapshot(collection(db,'teamTrips',tripId,'ticketPhotos'), snap => {
        onData(snap.docs.map(s => ({...s.data(),id:s.id})).filter(x => x && /^(up|down)$/.test(x.direction)));
      }, onError);
    } catch (e) {
      onError(e);
      return () => {};
    }
  },
  async upload(tripId, direction, file) {
    const {db,user,storage} = context(tripId);
    if (window.D4TripLocal?.canEditTickets?.() !== true) throw Error('Admin access required');
    if (!/^(up|down)$/.test(direction)) throw Error('Choose Up or Down tickets');
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024 || file.size < 1) throw Error('Choose an image under 15 MB');
    const id = crypto.randomUUID();
    const storagePath = 'tripTickets/' + tripId + '/' + direction + '/' + id;
    const fileRef = storageRef(storage,storagePath);
    await uploadBytes(fileRef,file,{contentType:file.type});
    try {
      await setDoc(photoDoc(db,tripId,id), {
        id,direction,storagePath,name:file.name.slice(0,120),type:file.type,
        size:file.size,createdAt:serverTimestamp(),byUid:user.uid
      });
    } catch (error) {
      await deleteObject(fileRef).catch(() => {});
      throw error;
    }
  },
  async read(tripId,ticket) {
    const {storage} = context(tripId);
    return getBlob(storageRef(storage,imagePath(tripId,ticket)));
  },
  async remove(tripId,ticket) {
    const {db,storage} = context(tripId);
    if (window.D4TripLocal?.canEditTickets?.() !== true) throw Error('Admin access required');
    const ref = storageRef(storage,imagePath(tripId,ticket));
    await deleteObject(ref);
    await deleteDoc(photoDoc(db,tripId,ticket.id));
  }
};
window.D4Tickets?.registerCloud(adapter);
window.addEventListener('d4-auth', () => window.D4Tickets?.registerCloud(adapter));