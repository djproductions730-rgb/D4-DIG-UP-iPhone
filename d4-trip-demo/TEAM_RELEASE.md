# Team rollout — draft, not deployed

Verified on 4 November 2026:
- `node check.cjs`: 19 deterministic client tests pass.
- Firestore emulator v1.22.0: role, invitation, revocation and revision suite passes (Firebase Tools 15.34.2, rules-unit-testing 6.0.0, Firebase 13.2.0).
- Production currently still has the earlier private-snapshot rules. Shared-trip rules and Hosting are not published.
- Publishing CLI has no authorized account; owner login is required.

## Behavior
The verified owner UID creates an explicit shared copy from the Members tab. The original device dataset is preserved. Chat history is excluded and chat remains Upcoming. Invite verified email addresses, then share the trip link. Only the owner can assign Trip Admins. Trip Admins can edit trip records and invite/revoke regular member access. Members have read-only access. Local display names never authorize shared writes.

Roster edits and account access are separate: removing a roster name does not revoke its email login. Use **Remove access** to revoke an account. Names with financial history cannot be deleted, preserving balances. Local IndexedDB photos/files are not uploaded and will not become available on other devices.

## Before team release
1. Sign in to Firebase CLI as the project owner.
2. Review shared rules and deploy them to `d4-trip`; publish Hosting after review.
3. Verify owner email, create a shared trip, and test on two real accounts/devices: invitation, edit visibility, revocation, refresh, offline/reconnect and installation.
4. Review remaining whole-trip schema limits and attachments before broad release. Emulator coverage is not an exhaustive security audit.

## Reproduce rules tests
From this directory, install test-only dependencies in a disposable checkout:
`npm install --no-save firebase-tools@15.34.2 @firebase/rules-unit-testing@6.0.0 firebase@13.2.0`

With Java available:
`npx firebase emulators:exec --project demo-d4-team --only firestore "node --test team-rules.emulator.cjs"`

All test data stays in the demo emulator. No production trip writes are needed.
