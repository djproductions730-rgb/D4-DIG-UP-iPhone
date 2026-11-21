# D4 DIG UP ↔ D47Lona: One-time Pair Code and Auto-sync

## User flow
1. Open DIG UP → More → **Pair & Auto-sync**. A strong code is **generated automatically** and retained on this device. Tap **Copy Pair Code** to copy it.
2. Open D47Lona → top **Sync** → **Pair Once · Enable Auto-sync**. Paste the private code once.
3. From then on, each app remembers the link and resumes cloud sync on open or when internet returns. No email, no password, and no repeating the code on each edit.
4. If both apps are in the same Safari website storage, the link may already be present in both. Separate Safari / iPhone Home Screen contexts must be paired once each.

## Safety and capabilities
- 256-bit random code; AES-GCM encrypts finance data on-device before upload. The pairing code IS the secret; never share it publicly.
- Code generation is immediate and works offline. **Registration and actual auto-sync are separate**: they remain unavailable until Firebase Anonymous Auth and the Firestore rules have been enabled. The UI must show a real **Synced** status before you consider your data connected.
- If cloud registration fails, the generated code stays the same. Retry after Firebase is configured; do not regenerate it for each attempt.
- If a screenshot exposed your code, DIG UP → **Pair & Auto-sync → Replace Exposed Pair Code** creates a new random link when you confirm. Re-pair any other browser/device using the new code. Local finance data is not removed. **Rotation does not revoke or delete old remote cloud records**; an administrator must clean up the obsolete cloud pairing if it was ever activated.

- Cloud stores only a SHA-256-derived document ID, record revisions and encrypted payloads.
- Cloud document lookup is unlistable. Anonymous Firebase Auth is used silently; it does not ask for email/password.
- DIG UP updates (banks, income/transactions including Salary) flow to D47Lona's linked balance / monthly salary calculations.
- D47Lona's loan records and EMI history are backed up and synced across D47Lona installations using the same code, not silently merged into DIG UP's independent loan-list UI.
- A conflicting financial edit is blocked with both copies retained rather than automatically choosing a winner.
- Clearing device browser/app data loses the locally stored pairing code. Keep a separate private backup and retain the pairing code securely.
- This is **cloud auto-sync only after Firebase console setup**. GitHub commits alone cannot activate Firebase Auth or publish security rules.

## Required one-time Firebase project setup (project ID: d4-finance-sync)
1. Firebase console → Authentication → Sign-in method → enable **Anonymous**.
2. Firebase console → Firestore Database: initialize if absent; on its **Rules** tab, replace the deployed rules with the **complete** contents of `finance-sync/firestore.rules` (preserves existing verified-email financeAccounts rules) and click **Publish**.
3. In Authentication → Settings → Authorized domains, include `djproductions730-rgb.github.io` if Firebase reports an unauthorized-domain error.
4. Verify the web configuration for `d4-finance-sync`, and test by creating the link in DIG UP, pairing in a separate browser / Home Screen app, then changing a harmless test bank transaction and confirming the refresh in D47Lona.
5. Before entering real personal finance data, export local JSON backups from both apps and check Firestore Rules in Rules Playground.

## Do not
- Put an actual user's code, password or private finance JSON into GitHub.
- Enable permissive Firestore read/write policies or allow collection listing.
- Claim pairing is connected until the UI shows **Synced** and both apps have confirmed data changes.
