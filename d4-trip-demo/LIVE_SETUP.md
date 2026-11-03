# D4 Trip — Firebase Live Setup (pre-production gate)

## What this branch adds

- Keeps the original D4 Trip UI, existing local data, trips, payments, expenses, plans, reports, memories, and export/import.
- Adds Firebase Authentication (email/password) and **private real-time Firestore backup** between devices signed into the **same Firebase UID**.
- Uses Firestore transactions with revision checks; it stops syncing if a stale device would overwrite another revision.
- Never auto-uploads demo/local data when Firebase is configured; the signed-in user must explicitly choose what to upload.
- Firestore rules deny every collection except the signed-in user's private `users/{uid}/snapshots/primary` doc.

**This is NOT YET the shared multi-user live trip app.** Different Firebase accounts cannot see the same trip using this branch. Local demo-name roles, client-generated trip codes and admin-only chat remain local; **DO NOT use them for real permissions**. Shared access requires a trusted server invite redemption flow, verified Firebase UID-to-trip membership, enforced Main Admin/Trip Admin roles, per-trip writes, and regression/security testing.

## Required Firebase Console setup

1. Firebase Console > D4 Trip project > Project Settings > Your apps > select the **registered Web App** > SDK setup and configuration > **Config**.
2. Copy only the **public Web App client config** to `d4-trip-demo/firebase-config.js` replacing `null`. Minimum required: `apiKey`, `authDomain`, `projectId`, `appId`; include `messagingSenderId` if provided. **Never add service-account JSON or private keys.**
3. Authentication > Sign-in method > enable **Email/Password**. Authentication > Settings > Authorized domains > add `djproductions730-rgb.github.io` if needed for the chosen sign-in provider.
4. Create Firestore Database in **production mode** if absent.
5. Publish **this exact** `d4-trip-demo/firestore.rules` file in Firestore Database > Rules, or use Firebase CLI from `d4-trip-demo`: `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`. Never use `allow read, write: if true`.
6. Merge branch only after testing. The existing GitHub Pages site remains in the `d4-trip-demo/` path for backward-compatible installed apps/bookmarks. After a published build, hard-refresh Safari/Chrome to update the service worker.
7. Settings & Profile > Firebase Cloud Sync: sign up or sign in. Back up device data before linking. On the first device, explicitly choose **Upload**. On a second device with the *same Firebase account*, choose **Restore**. Later same-account visits relink automatically when local data has no pending edits.

## Safety checks before using

- Run `node check.cjs` to inspect syntax and restrictive rules.
- Verify unauthenticated Firestore reads and writes are denied and other-user snapshots are denied.
- Test a fresh test account, two browsers, edit trip fee/expense, and verify same-account changes arrive via snapshot.
- Test simultaneous edits to trigger revision conflict — one copy must not overwrite the other.
- Check an offline edit and reload; export JSON if prompted to resolve unsynced data.
- Check JSON export/import, payments, plans, charts/reports, and phone PWA install.
- IndexedDB-stored photos/videos remain on the device. Attachments embedded in JSON are subject to a safe 900 KB snapshot limit. Use Firebase Storage with rules for future cross-device media.

## Still required for a truly shared group app

- Protected Main Admin bootstrap (server-owned UID/custom claim), per-trip UID memberships and revocation.
- Expiring server-validated invitation codes, no UI-name-based authorization.
- Firestore per-trip documents and payment transactions; real-time group and admins-only message collections.
- Rules tests in Firebase Emulator, App Check/rate-limit/abuse safeguards, Storage rules, live integration QA.
- Firebase project configuration plus deploy/Console access.

**Do not claim shared live mode is active until these gates pass.**
