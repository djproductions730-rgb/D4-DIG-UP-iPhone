# D4 DIG UP — verified Android APK to Brave migration

STATUS: OTP migration bridge deployed; migration.js points to its /exec URL.
Deployment and empty-email validation checked; real account OTP/export/import still requires account-holder testing.
The new Web Settings has an Import verified Android backup control.
This is a ONE-TIME LOCAL COPY; it is NOT live account sync.

OWNER ACTIVATION STEPS
1. Go to script.google.com → New project → D4 DIG UP Migration Bridge.
2. Paste migration-bridge/Code.gs into Code.gs.
3. Add HTML file called Migration, paste migration-bridge/Migration.html.
4. Set Script Property D4_ORIGINAL_API_URL to the EXISTING WORKING original
   D4 DIG UP finance APK backend /exec URL from NativeApi.java of the v15 repo.
   Do not use a D4 Diet URL or a separate admin URL.
5. Deploy → New deployment → Web app → Execute as Me → Who has access Anyone.
   This public MIGRATION BRIDGE verifies user identity using original backend
   email OTP before releasing any data. It offers NO admin read privilege.
6. Copy the NEW bridge /exec URL.
7. Set MIGRATION_BRIDGE_URL inside migration.js to the NEW bridge URL.
8. Commit to GitHub and test one authorized account. Original backend stays unchanged.
9. NEVER paste user OTP, source database contents, session tokens, or personal
   financial exports into the GitHub repo or chat.

BLESSY STEPS AFTER DEPLOYMENT
1. In her own Brave browser open the exact existing D4 DIG UP iPhone Pages link.
2. Settings → Verify old Gmail & get backup.
3. Blessy enters the same registered Gmail as her original Android APK.
4. Blessy herself enters her six-digit OTP. She must NOT share the OTP.
5. Select Download My D4 Account JSON (verify counts are not zero).
6. Return to Brave D4 DIG UP → Settings → Import verified Android backup.
7. Select her downloaded JSON. Check displayed account and record counts.
8. Confirm import, then verify banks, transactions, plans, loans.
9. Save a new Brave backup privately, do not uninstall existing APK.

SAFETY
- Any existing Brave data blocks migration (no silent replacement).
- Bank opening balance plus native transactions generates account balances.
- Transfers adjust balances, but not expense totals.
- Unsupported or ambiguous native structures abort instead of guessing.
- Financial records are copied without write operations. The original OTP login backend
  creates a session row and can create a user row for an unknown verified email.
  Use an existing registered account only; no production OTP test was run by the agent.
- Private JSON backup must be saved securely.
- Brave local storage is not a cloud profile. Changing browsers, clearing site
  data, or using another device will not automatically transfer records.
- Real-time sync requires a separate authenticated backend integration.
