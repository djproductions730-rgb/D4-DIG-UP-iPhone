# D4 Trip — Milestone 05 trusted server DRAFT

This folder is deliberately **not** referenced by the root `firebase.json`.
No server endpoints or draft shared rules have been deployed, and the existing public app still uses the offline/private-backup mode.

### Data boundaries
- Firestore `trips/{tripId}` with `ownerUid`, `targetCents`
- `trips/{tripId}/members/{firebaseUid}` role `owner` / `admin` / `member`; status `active` / `revoked`
- `tripInvites/{sha256(inviteCode)}`: server-managed, single-use with expiration
- `trips/{tripId}/rooms/{roomId}` and `messages/{messageId}`
- `trips/{tripId}/payments/{paymentId}`: immutable payment receipts
- `trips/{tripId}/audit/{eventId}`: audit records created by trusted server transactions

### Available draft Firebase callable actions
`createTrip`: allow only verified designated Main Admin configured through trusted runtime environment.
`issueInvite`: only active Trip Admin/Owner; 24-byte random, SHA-256 stored, one-time use.
`redeemInvite`: verified Auth account; grants **member** only; consumed in transaction.
`changeRole`: Owner only; active Member → Admin or Admin → Member, never alters Owner.
`revokeMember`: Owner may revoke Admin/Member; Trip Admin may revoke Member only; financial history retained.
`recordPayment`: Owner/Admin only; paise-precise, target checked transactionally, stage tagged; historical receipts append-only.
`openDirectChat`: Owner only; recipient must be active; deterministic private room ID.

### Release gates
1. Deploy and verify *only* after configuring `D4_TRIP_MAIN_OWNER_UID` on Cloud Functions and enabling Firebase App Check.
2. Provision existing trips/account identities through a server-mediated migration, with explicit local-backup/export consent.
3. Promote `firestore.shared.draft.rules` to production rules only after owner identity, invite redemption and cross-account access testing.
4. Wire the PWA client to the callable endpoints, realtime Firestore listeners and member UID identities.
5. Test App Check, expiry/revocation, concurrent payments, two physical devices and audits.
6. Keep production `firebase.json` pointing to `firestore.rules` until every gate passes.

**Never use display names, locally editable admin selections, or plain trip codes as real access control.**
