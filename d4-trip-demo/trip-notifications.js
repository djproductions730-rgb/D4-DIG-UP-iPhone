import {getFunctions, httpsCallable} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js';

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-trip-push]');
  if (!button) return;
  const local = window.D4TripLocal;
  if (!('PushManager' in window) || !('serviceWorker' in navigator) || !('Notification' in window)) {
    local.toast('On iPhone, add D4 Trip to your Home Screen and open it there to enable notifications.');
    return;
  }
  button.disabled = true;
  try {
    if (await Notification.requestPermission() !== 'granted') throw Error('Allow notifications in your device settings.');
    const tripId = local.teamId;
    const uid = window.D4TripCloud.auth.currentUser.uid;
    const register = httpsCallable(getFunctions(), 'tripPushRegistration');
    const {data} = await register({tripId});
    const worker = await navigator.serviceWorker.ready;
    const applicationServerKey = Uint8Array.from(atob(data.publicKey.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    let subscription = await worker.pushManager.getSubscription();
    if (!subscription) subscription = await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
    if (uid !== window.D4TripCloud.auth.currentUser?.uid) throw Error('Account changed. Open your trip again.');
    await register({tripId,subscription:subscription.toJSON()});
    localStorage.setItem('d4-push-account',uid);
    local.toast('Trip notifications enabled on this device.');
  } catch(e) { local.toast(e.message || 'Could not enable notifications. Try again.'); }
  finally { button.disabled = false; }
});
window.addEventListener('d4-auth',async () => {
  const previous = localStorage.getItem('d4-push-account');
  if (!previous || previous === window.D4TripCloud?.auth?.currentUser?.uid) return;
  const registration = await navigator.serviceWorker?.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription || await subscription.unsubscribe()) localStorage.removeItem('d4-push-account');
});
