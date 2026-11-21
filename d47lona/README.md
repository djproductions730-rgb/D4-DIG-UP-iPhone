# D47Lona — Crystal Glossy
A personal loan manager (PWA) under the existing D4 DIG UP iPhone GitHub Pages site.

## Data privacy
The publicly deployed app intentionally starts with **no personal loans and zero-valued bank snapshots**. It does not expose private balances, salaries or loan terms in this repository. Restore your personal data only on your trusted device using **Settings → Restore backup** with a privately supplied D47Lona JSON file. Do not commit or publicly share that backup.

## Features
- Home, Loans, EMI Schedule, Reminders and Settings
- Add/edit loans only once taken; paid/undo cycles and exact per-cycle schedules from private backup
- Crystal Glossy themes, local-first offline support, calendar (.ics) reminder export
- No actual payments or direct bank API are ever invoked

## D4 DIG UP browser bridge
The existing DIG UP frontend and D47Lona both use localStorage under the **same GitHub Pages origin**.
When the DIG UP local record (`d4webv15`) is present in that browser, D47Lona can:
- read and reflect the bank balance on this same device;
- when marking an EMI Paid with deduction, post one Expense entry and update the bank balance in both app stores;
- undo the same recorded EMI, remove its entry and restore the recorded bank balance;
- refresh balances on tab focus/storage events. DIG UP also refreshes its screen on storage events.

The bridge uses a deterministic ID for EMI entries to reduce duplicate deductions. It is **not Firebase, cross-device sync, bank API, or real-money payment processing**. Apps on different origins or browsers cannot share these local records. Back up both apps and reconcile against actual bank statements. Avoid concurrent conflicting balance edits.

## Install
- iPhone: open the HTTPS Pages address in Safari → Share → Add to Home Screen.
- Android: open the HTTPS Pages address in Chrome → menu → Install app.
- The repository's `d47lona-android.yml` GitHub Actions workflow attempts to build an Android debug APK under Actions → Artifacts. It must succeed before an APK can be downloaded; this is not a signed Play Store release.
- Native iPhone IPA requires an Apple developer signing identity and an iOS build process; not included.

## Hosting
The existing `.github/workflows/pages.yml` uploads the repository to GitHub Pages on main branch pushes and generates D47Lona PNG icons from SVG. The deployment should be checked in Actions; a committed source file is **not proof the live website has updated**.
