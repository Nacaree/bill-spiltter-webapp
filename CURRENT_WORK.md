# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Stage 4 daily cleanup automation implemented locally on `main`; activation pending.
Stage 1 complete; Stage 2 skipped; Stage 3 migration/live smoke checks user-passed.
No new migration. Existing work preserved; tested automation is ready to publish.

## Implementation and validation

- GET `/api/cron/lifecycle-cleanup`, daily `0 20 * * *` UTC (03–04 Phnom Penh).
- Production-only bearer auth, enable flag, matching explicit project ref;
  gates precede client construction. HEAD/other methods reject; no-store responses.
- Per run: up to 20 bills + 20 drafts, 20 old uploads, 100 old counter windows,
  then 40 file batches of 3. Existing lifecycle deadlines/leases remain enforced.
- Limits: 300s function, 210s soft stop, 240s hard abort, 15s per request.
- Stops on failures; safe aggregate results + existing Sentry lifecycle_cleanup.
  No new email/missed-run alerts. Failed/unfinished work retries next daily run.
- 280 offline tests pass; 8 hosted/provider tests skipped. Lint and webpack build
  and full-repository formatting/diff checks pass; source-map uploads disabled.
  Built-server local HTTP checks pass:
  GET 401, authenticated disabled GET 503, HEAD/POST/OPTIONS 405; all no-store.

## Hosted preparation and next step

- Saved Vercel Production-only config: LIFECYCLE_CLEANUP_ENABLED=false and
  LIFECYCLE_CLEANUP_PROJECT_REF=uvznqgkbodejvksmtafh. Verified list after reload.
- User saved CRON_SECRET; its Secret type and Production-only scope were verified
  in Chrome. Value was not revealed. User redeployment AS8JUv1uS used old f4f8b00.
- Publish the worker to main, verify disabled deployment/access gates, enable and
  redeploy, then verify cron
  registration/first scheduled invocation. README contains rollout/stop runbook.
- Automation is NOT active. Stage 4 remains open; no new Production cleanup ran.

## Existing cleanup evidence / remaining checks

- Oct 23: 5 expired drafts removed; 10 due file jobs processed across approved
  batches without failure. Latest queue: 13 waiting, 0 due; no leases.
- Deleted bill's 3 folders empty; 10 draft targets absent. Active bills=19,
  confirmed receipts=8, expenses=10, unchanged. Last checked ~02:33 GMT+7.
- Final sweeps after Oct 24 02:30 GMT+7; verify active confirmed receipt still opens.
- QR replacement failures lack live-bill orphan retries; documented limitation.
- Credential rotation, broader deployed-flow tests, real devices/screen readers
  and Firefox remain. Preview shares Production; prior missing RATE_LIMIT_SECRET.
- Privacy/support content and Privacy & Help page remain off the to-do list.
