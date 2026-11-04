# D4 Trip Premium Access Manager — staged, not production-ready

## Current state
The existing GitHub Pages application is an offline/localStorage demo. Its "Karthik" owner profile and switchable demo names are not authenticated identities. **Do not deploy this branch as a secure production app yet.** Do not upload this rules file to production without Firebase Auth integration, schema migration and emulator tests.

## Proposed authenticated Firestore schema
`d4Trips/{tripId}`: `ownerUid` (Firebase Authentication UID), `memberUids` (UID array containing owner and admins), `adminUids` (UID array), and current trip metadata. Nested `expenses`, `payments`, `plans`, `notes`, `reminders` and `chats/{room}/messages` collections store shared data.

Permissions in `firestore.rules`:
- Main Admin (owner UID) can promote/demote admins, manage members and expenses, and update trip metadata.
- Admins can add/remove regular members (modify only `memberUids`) and manage expenses/payments/plans.
- Members can read expenses and payment history; they cannot edit member roles, expenses or payments.
- Group chat is accessible to trip members; admins chat only to admins and owner.
- Other documents/collections default to deny.

## Before any live deployment
1. Connect the correct Firebase project; enable Authentication and plan account recovery. Associate the real Main Admin's authenticated UID with existing trips through a trusted migration.
2. Back up the **actual** localStorage trip data on each device (the demo is not cloud-synced). Map old display names to verified UIDs; retain old trip IDs, expenses, payment entries, chat messages, plan dates and attachments. Validate member/owner permissions on migrated data before cutover.
3. Migrate to the collections/fields above and replace client-side role checks plus localStorage mutation with authenticated Firestore operations. Do not trust profile strings or trip codes for role elevation.
4. Use Firebase Emulator Suite to test: member cannot add or delete expense; member cannot add/remove members; admin can manage regular members but cannot modify `adminUids`; admin cannot remove owner or admins; only owner can promote/demote; nonmember cannot read; members can read expense history; admin-only chats are not readable by regular members. Verify backend rejects unauthorized direct requests, not just disabled buttons.
5. Run browser/mobile regression tests for login, payment paid/pending, existing trip selection, member add/remove, expense create/delete, chats, imports and export. Verify against a migration backup.
6. Merge to main and deploy Pages **only after** passing all checks and confirming Firebase project rules are deployed and active.

## Dev verification performed
- JavaScript syntax checked using JavaScript function parser (not a browser integration run).
- Inspected client-side role guards and handlers for payments/chats.
- No emulator, Firebase Auth, cloud migration, or live deployment has been performed.
