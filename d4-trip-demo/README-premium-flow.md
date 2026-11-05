# Premium trip flow — development only

The existing app now uses central Main Admin, Admin and Trip Members entry buttons. Destination cards contain only user-created trips. Main Admin uses the existing owner profile; selecting the button cannot turn a member into an owner. An admin must already be assigned to the trip and supply its separate admin code. The owner can generate that code under Quick Actions → Access codes. Member entry uses the existing trip invitation code.

After entry, the payment scoreboard uses the original `collectionTotals` function and payment form. Skip opens the trip dashboard. The four bottom buttons are Expenses, Trip Days (with count), Settings and Chats. Admins and the owner can add/edit timed day milestones using the existing plan forms; members view them. Only the owner sees Quick Actions. Settings includes dark mode, the current profile, existing notes/files/reports/reminders/memories and backups. Chat is a Coming soon placeholder; saved chat records remain in the database and backups.

No trip, payment, expense, plan, media, or chat records are deleted or migrated. Legacy sample IDs are omitted from visible trip lists, but retained in storage and backups. `adminCode` is added only when the owner explicitly generates one. Appearance uses a separate `d4_trip_premium_dark` setting. Existing long forms and secondary legacy tools retain their internal scroll area; the new primary screens use buttons and pagination rather than horizontal swiping.

## Release limitation

This branch still identifies roles using local profile names. Codes are local UI gates, not secure authentication. No password login, verified identity, server-enforced permissions, or cross-device sync was added. Do not deploy this as secure multi-user access. Preserve the owner's real authenticated session when integrating a future backend; never grant owner privileges merely because someone presses Main Admin.

## Verification

Run the smoke test with Node.js and Playwright available:

    node d4-trip-demo/premium-flow.smoke.cjs

It serves files on loopback in an isolated browser context and checks trip creation, existing payment forms/totals, admin assignment and code generation, failed/successful role entry, plan permissions, chat placeholder, data preservation and primary layouts at 320×568, 360×640, 390×844 and 412×915. It does not access production records. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium browser if Playwright's browser is not installed. Screenshots are written to a temporary directory.

Real iPhone Safari and Android device verification and backend authentication remain release checks. The production Pages workflow and branch are unchanged.

