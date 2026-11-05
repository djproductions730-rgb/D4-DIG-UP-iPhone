/* Firebase Web App configuration is public client metadata (NOT a service account key).
 * Firebase Console > Project settings > Your apps > Web app > SDK setup > Config.
 * Never paste service-account JSON, private keys, OAuth client secrets, or admin tokens.
 * Registered D4 Trip Web App, project d4-trip. Auth and rules must be deployed
 * and verified separately; this config alone does not enable live/shared sync.
 */
window.D4_TRIP_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAe4-7LJ1a5RCTTvp5m4fyJhiBjuQehDD8",
  authDomain: "d4-trip.firebaseapp.com",
  projectId: "d4-trip",
  storageBucket: "d4-trip.firebasestorage.app",
  messagingSenderId: "734858180381",
  appId: "1:734858180381:web:9c9c83993ec136f1b453f4",
  measurementId: "G-ES040GJNKG"
};

// M05: secure shared groups remain OFF until verified server/App Check/rules release.
window.D4_TRIP_SHARED_ROLLOUT = false;
// Enable only after the separate secured team-invites Functions are deployed and tested.
window.D4_TRIP_TEAM_CODES_ENABLED = false;
window.D4_TRIP_APP_CHECK_SITE_KEY = '';
