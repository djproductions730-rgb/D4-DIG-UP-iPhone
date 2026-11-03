# D4 Trip — next development milestones

## Shipped in GitHub Pages demo
- Trip chooser, separate trip data, collection totals, paid/partial/unpaid member cards
- Day plans, expense tracking, notes, local chat demo, memories and printable reports
- PWA manifest, icon, offline shell cache, iOS/Android install help

## M2 — secure shared backend (NOT CONNECTED)
- Create dedicated Firebase project for D4 Trip
- Enable Firebase Authentication (phone OTP with authorized domains and abuse protection)
- Map every Firebase Auth UID to a user profile; no trusting user-entered names for permissions
- Data model: trips/{tripId}; trips/{tripId}/members/{uid}; trips/{tripId}/payments/{paymentId}; trips/{tripId}/expenses/{expenseId}; trips/{tripId}/plans/{planId}; trips/{tripId}/messages/{messageId}
- Main Admin is granted via protected server-side custom claim; never by join code alone
- Join codes: random, expiring, stored hashed on server, redeemed through verified server function, scoped to a trip and role
- Trip Admin granted only by Main Admin through protected function
- Transactional payment writes, audit log, member role revocation, access tests

## M3 — multi-device sync
- Replace localStorage data layer with Firestore listeners and offline persistence
- Preserve a one-time export/import migration path from local demo
- Real-time group chat and admin-only chat
- Storage upload rules for receipts and memories

## M4 — notifications and release
- Server-scheduled trip reminders and push notifications (permissions required)
- Android package via Capacitor or Trusted Web Activity, signing and QA
- iPhone PWA first; native iOS requires Apple signing/build process
- Privacy policy, backup, data deletion, production testing

## Security gate
Do NOT enable a permissive Firestore rule for testing. The starter rules intentionally deny all reads and writes until authenticated role-aware rules and tests are implemented.
