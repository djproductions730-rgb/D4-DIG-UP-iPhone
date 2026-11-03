# D4 Trip — Verified milestone status (4 November 2026)

## M01 — Offline app foundation: built
- My Trips, trip chooser, collection tracking, day plans, expenses and split, notes, memories, reports.
- Device-only local data and backup/export supported.

## M02 — People and payment UI: development branch built
- Add/Remove Member actions with Save/Confirm flow.
- Advance/Balance/Full payment labels, paise-safe paid/remaining totals and Paid/Partial/Unpaid counts.
- Financial history prevents accidental destructive member removal.
- These role and payment controls are **offline/demo UI only** until shared backend is connected.

## M03 — Mobile and desktop QA: automated checks passed
- Chromium desktop and phone-size smoke tests for advance payment, member Save/Remove and persistence after reload.
- Mobile Save-button overlay regression fixed.
- Cinematic travel intro with original D4 globe/metallic logo, Skip, Replay and reduced-motion handling; tested in Chromium.
- Physical iPhone/Android testing remains a release gate.

## M04 — Private Firebase sync: emulator tests passed, real-device testing pending
- Real Firebase Web configuration and UID-private snapshot rules exist in `firebase-config.js` and `firestore.rules`.
- Same-account listener/transaction logic, backup-before-restore option and conflict handling.
- Firestore emulator cross-client sync, anonymous access-denial and cross-UID isolation tests passed.
- Production two-device account testing and merge/deployment **not completed**.

## M05 — Secure shared membership: trusted backend + rules draft tested, NOT DEPLOYED
- Undeployed `firestore.shared.draft.rules`: active Firebase UID membership, owner/admin/member roles, private two-person rooms, owner/admin-only chat, immutable payment receipts and audit data.
- Undeployed `server-draft/`: verified owner trip creation; one-use hashed invite issuance and redemption; admin promotion/demotion; revocation; transaction-safe advance/balance payments; private chat provisioning; audit events.
- Draft security rules: **9/9 emulator tests passed**.
- Trusted backend: **8/8 Firestore Emulator tests passed**, plus **1/1 callable identity-spoofing check**.
- Expired or consumed invites are invalid; unredeemed invites also stop working after issuer revocation.
- Existing production `firebase.json` still points to private-only `firestore.rules`. No shared client feature is enabled.
- A client cannot alter trip roles/payments by locally selecting a display name.

### Required before M05 release
1. Configure trusted Functions environment `D4_TRIP_MAIN_OWNER_UID`; review Main Admin UID and verified sign-in.
2. Enable/configure App Check for callable endpoints.
3. Deploy callable server endpoints separately after review.
4. Map existing user accounts to trusted Firebase UIDs; migrate with explicit backup/export consent.
5. Wire the app's UI to callable endpoints and authenticated per-trip Firestore listeners.
6. Test two different real Firebase accounts on physical devices, permission revocation and concurrent payment requests.
7. Review and deploy `firestore.shared.draft.rules` only after all integration/security checks pass.
8. Keep the original public GitHub Pages demo unaffected until safe deployment is approved.

## M06 — Notifications and release: pending
- Authenticated invite onboarding, real-time private/admin chat and cross-account trip sync.
- Receipts/media storage with restrictive Storage rules.
- Push notifications and scheduled reminders.
- Android/iPhone PWA QA; privacy policy, account deletion and backups.

**Important:** No work runs automatically between conversations. Continue from this branch and read CI results before merging.
