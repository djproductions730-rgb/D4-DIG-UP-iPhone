# D4 Trip premium development QA — 5 November 2026

Existing production: https://d4-trip.web.app  
Branch: `dev/d4-trip-live-premium-20261105`  
Draft review: https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/pull/2

## Completed in this continuation

- Expenses bottom tab now opens the same note-only history as the trip expense screen. Legacy split records remain in storage; their allocations and amounts remain protected when notes are edited.
- Added Trip Dashboard / My Trips navigation so users can leave each section without losing access to the dashboard.
- Expense add/edit/delete and itinerary add/edit/delete/completion/date changes restore the previous trip state if persistence rejects a change. Success feedback follows successful local persistence or acceptance into the existing shared save queue; server transaction failures still reconnect to confirmed server state.
- Premium assets and intro dependencies are included in the updated service-worker cache.
- Corrected the private rules test's emulator port to 8088, and added the actual shared-team rules tests to CI.
- Prepared a disconnected staging bundle from this existing source. Preview roles and all entries in this bundle are explicitly sample-only. Production source retains its real Firebase config and owner UID unchanged.

## Verified results

Implementation commit: `7de843691df21a24564a0088d135a343356b366d`.

| Check | Evidence | Result |
| --- | --- | --- |
| JavaScript, premium behavior and 40 regression tests | [Integrity CI](https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/actions/runs/42008685469) | Passed |
| Checked-in Firestore rules: 7 private/same-UID tests plus shared-role scenario | [Security CI](https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/actions/runs/42008685484) | 8 tests passed; also passed locally with demo projects |
| Chromium desktop 1280×800, phone 390×844 and small phone 360×780 | [Browser CI](https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/actions/runs/42008685419) | Passed |
| WebKit at the same three viewport sizes | Same browser CI, WebKit job | Passed; browser-engine simulation, not physical iPhone acceptance |
| Staging package and no-live-Firebase assertions | [Staging artifact](https://github.com/djproductions730-rgb/D4-DIG-UP-iPhone/actions/runs/42008685516) | Passed; downloadable artifact `d4-trip-pr-2-isolated-staging` |
| Manual isolated browser checks | Staging fixture only | Payment balance totals, expense add/edit, itinerary add/day selection, member add/remove, themes and read-only Member screens verified |

Automated browser flows also check payments after reload, roster persistence, itinerary edit/completion, member access to notes with no edit controls, three themes, Chats Coming Soon, cinematic skip/replay, and reduced-motion behavior. Tests block live Auth/Firestore API endpoints in their primary browser contexts.

### Role matrix tested against the checked-in rules

| Identity | Read trip | Edit trip | Invite Member | Promote/demote Admin | Remove access |
| --- | --- | --- | --- | --- | --- |
| Verified designated Main Admin UID | Yes | Yes | Yes | Yes | Yes |
| Verified email with Admin grant | Yes | Yes | Yes | No | Member grants only |
| Verified email with Member grant | Yes | No | No | No | No |
| Unverified, anonymous, outsider or revoked account | No | No | No | No | No |

Cross-trip isolation, grant enumeration restrictions, owner impersonation, stale revisions, forged update identities, malformed top-level data and extra fields were also tested. No production records or users were created, changed, migrated or deleted.

## Staging preview

Build from repository root:

```sh
node d4-trip-demo/prepare-staging.cjs
```

This creates `.staging` assets and a hosting-only `firebase.preview.json` inside `d4-trip-demo`. The generated bundle has no Firebase SDK modules or real Firebase config, no service-worker registration, and a preview CSP with `connect-src 'none'`. It has a clearly labeled sample-role selector. It is a review build of the existing application, not a replacement application or data migration.

With an authorized Firebase CLI session, deploy ONLY the temporary preview channel:

```sh
npx firebase hosting:channel:deploy premium-pr-2 --project d4-trip --config d4-trip-demo/firebase.preview.json --expires 7d
```

No deploy command was run in this continuation. Firebase CLI reports missing authentication; the project console also opens at Google sign-in. There is therefore **no verified Firebase-hosted staging URL yet**. The Work browser can review the prepared disconnected preview. Do not use `firebase deploy`, clone any preview to `live`, merge the PR, deploy rules/functions, or run migrations without the user's production approval.

## Source rules audit and remaining release gates

This audit applies to repository rules only; the deployed Firebase rules could not be fetched or compared without project authentication.

```json
{
  "score": 4,
  "summary": "Checked-in rules enforce verified identity and role boundaries in emulator tests. Whole-trip schema validation remains partial; deployed-rule parity and real-account acceptance are unverified.",
  "findings": [
    {
      "check": "Type Safety / Storage Abuse",
      "severity": "moderate",
      "issue": "Whole-trip documents validate only selected fields and list sizes. An authorized editor can save malformed nested payment, itinerary, note or media data; historical receipts are not an append-only server ledger in the current live model.",
      "recommendation": "Review representative legacy records and add compatible nested validation or a separately approved server-mediated ledger migration before claiming production-wide data-integrity guarantees. Do not tighten rules blindly against existing users."
    }
  ]
}
```

- Live deployed-rule comparison, Main Admin UID/account verification and two-real-account/device acceptance require authenticated Firebase project access.
- Member/Admin code redemption still belongs to the disabled `server-draft` model. It has not been deployed or connected to existing `teamTrips`; the current shared model uses verified-email grants. Completing code redemption safely requires explicit identity/data compatibility work rather than switching collections or enabling the draft blindly.
- Physical iPhone/Android installation, offline/reconnect acceptance, email-reset delivery and the complete legacy schema/media review remain release gates. Password-reset logic has deterministic regression coverage; no real reset email was sent.
- Chats remain Coming Soon. Existing stored chat data remains untouched.
- Production deployment remains pending the user's explicit approval after these release gates are resolved.
