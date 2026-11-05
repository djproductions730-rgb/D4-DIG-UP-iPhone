# D4 Trip — Admin / Member Code Join Release Gate

Status: **implemented on development branch only; OFF in production**.
Existing live site: https://d4-trip.web.app
PR: https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/pull/2

## User flow (after verified rollout)
1. Main Admin logs into Firebase using designated verified owner account, opens a published shared trip, and chooses **Generate Admin Code** or **Generate Member Code** from the Members > Team access section.
2. Trip Admins may issue **Member Code** only. A Member has no code-generation or edit privileges.
3. Share each securely generated code with **one** person. It is valid for 7 days and works once. Generate a separate code for each person.
4. Recipient signs into their own Firebase account, verifies their email, taps **Join Trip**, and enters the code exactly as received (case sensitive). The app calls the verified Firebase callable; on success it navigates to that existing team trip using a `?team=<id>` link.
5. Firestore access grant is keyed by verified email, not demo display names. Main Admin / Admin / Member capabilities follow server-enforced rules. Adding a roster name does NOT automatically authorize an email, nor does issuing a code erase or migrate any existing records.

**Legacy** browser-only trip codes such as `D4GOAP56W` are **not** secure cross-device invite codes; generate a new one after rollout. Do not activate cloud access based only on a short legacy code.

## Security and compatibility
- Existing collection `teamTrips/{tripId}` and `teamTrips/{tripId}/access/{verifiedEmail}` preserved.
- No payments, itinerary, member roster, attachments, historical split records, users, or private backups are migrated or modified by issuing/redeeming code; redemption only creates/updates the target email grant.
- `teamJoinCodes/{sha256(code)}` stores one-use code hash, trip ID, intended role, issuer and expiry. Plain code is displayed only upon issuance; never stored.
- Callable Functions use `enforceAppCheck:true`; the verified Firebase ID token provides UID and verified email; requests cannot override the authenticated user.
- Only the designated Main Admin UID may issue Admin codes, and only Admins/Main Admin may issue Member codes. Redeem checks current issuer authority and atomically marks the code used.
- Existing Admin role is never demoted by redeeming a Member code; revoked access cannot be silently revived by reusing a consumed code.
- Current Firestore rules deny web clients direct reads/writes of `teamJoinCodes`.
- No blanket rules or public trip lookup.

## Required before any production release
1. Back up/export old local and shared data. Verify real Main Admin Firebase UID and currently deployed Firestore rules against repository; ensure existing shared `teamTrips` documents are accessible.
2. Set up a **separate Firebase test/staging project** with Email/Password Auth, Firestore test rules, and App Check. Register the test web domain for App Check. Cloud Functions generally require a Blaze billing plan; review budget alerts.
3. Install dependencies from `d4-trip-demo/team-invites`, and configure **D4_TRIP_MAIN_OWNER_UID** as a trusted Functions runtime environment variable matching actual verified owner UID. Do not commit service credentials or private keys.
4. Test on that project with two actual phones/accounts and an Admin: member code, admin code, wrong code, reused code, expired code, revoked issuer, denied edit, repeated refresh and login. Confirm UI error messages, offline/reconnect and older records.
5. With explicit release approval and authorized Firebase CLI (from `d4-trip-demo`), deploy **only** the separate Functions codebase using the reviewed config:
   `firebase deploy --only functions:team-invites --project d4-trip --config firebase.invites.json`
6. Set the public App Check **site key** in `firebase-config.js` (never use the secret key). Only then set `D4_TRIP_TEAM_CODES_ENABLED=true`. Re-run CI and an authenticated preview-channel test before the approved Hosting-only deploy:
   `firebase deploy --only hosting --project d4-trip`
7. Confirm one real owner and two member accounts work on live phones, then inform users to create **new** one-time codes.

**Until functions + valid App Check setup are live and the feature flag is enabled, Generate Code buttons remain hidden and cross-device code joining returns a clear unavailable message.** Current verified-email invite + shared link remains the available team onboarding path.

Never deploy/merge production merely because development tests pass.
