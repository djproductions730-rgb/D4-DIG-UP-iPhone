# Team rollout — deployed beta, acceptance testing pending

Verified on 4 November 2026:
- `node check.cjs`: 31 deterministic client tests pass (sync, payments, roster, and staged group preview).
- Firestore emulator v1.22.0: role, invitation, revocation and revision suite passes (Firebase Tools 15.34.2, rules-unit-testing 6.0.0, Firebase 13.2.0).
- Owner authenticated Firebase CLI successfully. Both shared-trip rules and Hosting were deployed to `d4-trip` on 4 November 2026 after a successful dry run.
- Live app: https://d4-trip.web.app . Dashboard and Firebase sign-in controls verified in browser. Real two-account/device acceptance remains pending.

## Behavior
The verified owner UID creates an explicit shared copy from the Members tab. The original device dataset is preserved. Chat history is excluded and chat remains Upcoming. Invite verified email addresses, then share the trip link. Only the owner can assign Trip Admins. Trip Admins can edit trip records and invite/revoke regular member access. Members have read-only access. Local display names never authorize shared writes.

Roster edits and account access are separate: removing a roster name does not revoke its email login. Use **Remove access** to revoke an account. Names with financial history cannot be deleted, preserving balances. Local IndexedDB photos/files are not uploaded and will not become available on other devices.

## Before team release
1. Rules and Hosting deployment are complete; keep this marked beta until real-device acceptance passes.
2. Localhost data does not automatically move to the hosted origin. Use explicit private cloud restore or JSON export/import; retain the original device backup.
3. Verify owner email, create a shared trip, and test on two real accounts/devices: invitation, edit visibility, revocation, refresh, offline/reconnect and installation.
4. Review remaining whole-trip schema limits and attachments before broad release. Emulator coverage is not an exhaustive security audit.

## Reproduce rules tests
From this directory, install test-only dependencies in a disposable checkout:
`npm install --no-save firebase-tools@15.34.2 @firebase/rules-unit-testing@6.0.0 firebase@13.2.0`

With Java available:
`npx firebase emulators:exec --project demo-d4-team --only firestore "node --test team-rules.emulator.cjs"`

All test data stays in the demo emulator. No production trip writes are needed.

## Release preparation — 4 November 2026
- Reconciled main branch with the Firebase development branch, preserving the deployed index, service worker, logo and intro. The legacy main intro script is retained as an unused asset.
- Payment and staged group tests now run in the standard check command and browser CI. Updated obsolete chat assertions to verify the current Upcoming state; restored the window stub for member rendering.
- Final acceptance remains pending: two real accounts/devices, offline/reconnect and phone installation. This preparation does not claim a new Hosting deployment or final production acceptance.
