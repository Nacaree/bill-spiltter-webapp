# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Stage 6 functional checks completed on Production, Oct 24 00:23–00:48 GMT+7,
with one upstream provider incident recorded as open, on the existing main branch.
User deferred Preview configuration; leave RATE_LIMIT_SECRET missing there.
Stage 5 committed at eec047e; Stage 2 skipped; Stage 3 migration user-reported applied.

## Hosted verification

- Ready Production EBRMBcGuW / eec047e verified in Chrome. No deployment/settings edit.
- Passed create/share/claim, guest persistence and access separation, manual expenses,
  shared balances, synthetic QR inspect/save/view, payment record and correction.
- Guest-only write denial showed a 45s wait, retained values and succeeded once
  after natural expiry. No policy, IP/global or other-bill quota manipulation.
- Initial receipt upload completed but extraction failed: provider_failed. Manual
  fallback worked. Sentry BILL-SPLITTER-WEBAPP-7 captured readable source lines.
- User approved one local diagnostic: HTTP 200, gemini-3.5-flash-lite, 2 items/$12.
  Owner completed Vercel verification; saved Production model matches local.
- User then approved ONE fresh Production attempt: succeeded, reviewed $5 + $7,
  confirmed exactly one $12 expense/$6 shares. Draft had zero expenses beforehand.
- Confirmed receipt reopened with image from ledger and separate incognito session;
  no reconfirmation controls or missing-image fallback. No extra provider calls.
- Both labelled synthetic bills and related rows deleted; all 6 target bucket
  folders empty. Six mandatory final sweeps remain; latest Oct 25 00:48:02 GMT+7.
- Final aggregates: 19 existing bills, 8 confirmed receipts, no synthetic bills;
  app extraction used=2. Total provider requests=3 (2 deployed + 1 approved local).
- Root/invalid links and unauthenticated cron GET/HEAD gates passed. Sentry still
  shows only the original handled error. Exact upstream cause remains unknown.

## Remaining

- Keep BILL-SPLITTER-WEBAPP-7 open; monitor recurrence and obtain safe HTTP status/
  provider error classification before proposing a fix. No proven root cause/fix.
- Stage 4: verify first scheduled invocation and original 13 final sweeps after
  Oct 24 02:30 GMT+7; six new fixture sweeps after Oct 25 deadlines. Queue=19,
  due=0 at final check. Verify file absence and an existing confirmed receipt view.
- Mobile fixes and automated axe/keyboard/reflow/emulation checks already passed.
- Only real-device/screen-reader/full manual keyboard/Firefox evidence is pending;
  reconcile existing user results before repeating checks, then Stage 7 closeout.
- Documentation only; no push, runtime/credential change or new migration.
- Stage 5 baseline: 293 offline tests pass, 8 hosted/provider skipped; lint/format/
  build pass with source-map uploads disabled. Stage 6 doc formatting/diff pass.
- Preview shares Production; no isolated backend. QR-orphan retry limit remains.
- Privacy/support content and Privacy & Help page remain off the to-do list.
