# D4 Trip release status — 4 November 2026

Current deployed beta: https://d4-trip.web.app

- M01: offline app foundation and backup/export implemented.
- M02: people and payment controls implemented; advances, balance, paid/pending totals and protected financial history covered by regression tests.
- M03: previous browser QA passed; release preparation now runs 31 deterministic regression tests through check.cjs and browser CI. Physical phone acceptance pending.
- M04: private Firebase sync and revision conflict handling implemented; live two-device acceptance pending.
- M05: verified-email shared trip grants, owner-assigned Trip Admins, read-only members and revocation implemented in team-sync.js; rules and Hosting deployed as beta. The separate server-draft/shared-runtime preview remains disabled and undeployed.
- M06: final release pending two real accounts/devices, offline/reconnect, install acceptance and whole-trip schema/media review. Chat remains Upcoming; media stays device-only; scheduled push is not available.

Logo and intro remain unchanged. See TEAM_RELEASE.md for deployment evidence, acceptance steps and limitations. No background work runs between turns.
