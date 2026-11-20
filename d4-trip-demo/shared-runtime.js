/* D4 Trip shared Firebase adapter — OFF unless all deployment gates are opted in.
 * Uses only verified Firebase UIDs; never writes to the local/offline trip dataset.
 * App Check is a required capability. Both callable Functions and Firestore rules
 * must be deployed before turning on these switches. This is not a production enablement.
 */
const enabled = window.D4_TRIP_SHARED_ROLLOUT === true;
const siteKey = window.D4_TRIP_APP_CHECK_SITE_KEY || '';
if (enabled && siteKey && window.D4TripShared) {
  try {
    const [
      appSdk, authSdk, functionsSdk, firestoreSdk, appCheckSdk
    ] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js')
    ]);
    const config = window.D4_TRIP_FIREBASE_CONFIG;
    if (!config?.projectId || !config?.appId) throw Error('Firebase Web App not configured');
    const app = appSdk.getApps().find(a => a.name === 'd4-trip') ||
      appSdk.initializeApp(config, 'd4-trip');
    const auth = authSdk.getAuth(app);
    const firestore = firestoreSdk.getFirestore(app);
    const functions = functionsSdk.getFunctions(app, 'asia-south2');
    const appCheck = appCheckSdk.initializeAppCheck(app, {
      provider: new appCheckSdk.ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled:true
    });
    // App Check initialization alone does not prove enforcement: the deployed
    // Functions endpoints must enforce it on the server.
    if (!appCheck) throw Error('App Check could not be initialized');
    const requiredUid = () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || firebaseUser.emailVerified !== true ||
          firebaseUser.uid !== window.D4TripCloud?.user?.uid)
        throw Error('Verified Firebase account required');
      return firebaseUser.uid;
    };
    const validTripId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{5,128}$/.test(id);
    const adapter = {
      async call(method,data) {
        if (!['createTrip','redeemInvite'].includes(method))
          throw Error('Unsupported beta action');
        const uid=requiredUid();
        const callable=functionsSdk.httpsCallable(functions, method, {timeout:20000});
        const response=await callable(data);
        if (requiredUid()!==uid) throw Error('Account changed during request');
        return response.data;
      },
      async getTrip(id) {
        if (!validTripId(id)) throw Error('Invalid trip reference');
        const uid=requiredUid();
        const snapshot=await firestoreSdk.getDoc(
          firestoreSdk.doc(firestore,'trips',id)
        );
        if (requiredUid()!==uid) throw Error('Account changed during request');
        if (!snapshot.exists()) throw Error('Trip is unavailable for this account');
        return {name:snapshot.data().name,destination:snapshot.data().destination};
      }
    };
    window.D4TripShared.setAdapter(adapter);
    authSdk.onAuthStateChanged(auth, () => window.D4TripShared.resetSession());
  } catch(err) {
    if (window.D4TripShared?.status) {
      window.D4TripShared.status.error =
        'Secure beta connection unavailable. Check App Check, Firebase functions and approved security rules.';
      window.D4TripLocal?.render?.();
    }
    console.error('D4 Trip secure rollout prerequisites missing:', err?.code || err?.name || 'unknown');
  }
} else if (enabled && !siteKey && window.D4TripShared?.status) {
  window.D4TripShared.status.error='App Check site key missing. Secure group actions unavailable.';
}
