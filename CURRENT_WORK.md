# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Stage 4 daily cleanup is ENABLED in Production; worker revision `b0ba0ac` on main.
No new migration; Stage 2 skipped. Existing work preserved, no new branch.
Implementation committed/pushed; documentation follow-up records rollout results.

## Implementation and validation

- GET `/api/cron/lifecycle-cleanup`, daily `0 20 * * *` UTC (03–04 Phnom Penh).
- Production-only bearer auth, enable flag, matching explicit project ref;
  gates precede client construction. HEAD/other methods reject; no-store responses.
- Per run: up to 20 bills + 20 drafts, 20 old uploads, 100 old counter windows,
  then 40 file batches of 3. Database deadlines/leases remain enforced.
- Limits: 300s function, 210s soft stop, 240s hard abort, 15s per request.
- Safe aggregate reporting + existing Sentry lifecycle_cleanup; stops on failure.
  No new email/missed-run alerts. Unfinished work retries on later daily runs.
- 280 offline tests pass; 8 hosted/provider tests skipped. Lint, formatting/diff
  and webpack build pass; source-map uploads disabled. Local HTTP checks passed.

## Hosted rollout evidence — 2026-10-23, GMT+7

- CRON_SECRET saved by user, Secret type, Production only; value never revealed.
- Worker b0ba0ac published; disabled deployment DjzWeacd8 passed public GET 401,
  HEAD/POST 405, no-store, and authenticated dashboard Run 503.
- User completed Vercel email verification; agent set enable flag true/redeployed.
- H8jKFNYNJ / b0ba0ac Ready Production at 03:00:28. Cron registration verified.
- Exactly one enabled dashboard probe approved: completed at 03:02:39, 571ms;
  all removals=0, files failed=0, countsComplete=true; 13 future sweeps kept queued.
- Read-only check at 03:02:55: active bills=19, confirmed receipts=8, expenses=10,
  unchanged. All eligible backlog counts=0; pendingFileJobs=13.
- README/HANDOFF record release links, schedule and emergency-stop instructions.

## Remaining

- Verify first time-triggered scheduled invocation (manual probe is distinct).
- Existing 13 final deadlines pass Oct 24 02:30 GMT+7; daily worker should handle
  them in a later 03–04 run. No manual return is needed to trigger cleanup.
- Verify final queue/file absence and active bill's confirmed receipt UI access
  before closing Stage 4. No artificial expiry or Production failure injection.
- QR replacement failures lack live-bill orphan retries; documented limitation.
- Credential rotation, broader deployed flows, real devices/screen readers and
  Firefox remain. Preview shares Production; prior missing RATE_LIMIT_SECRET.
- Privacy/support content and Privacy & Help page remain off the to-do list.
