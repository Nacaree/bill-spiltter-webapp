# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Stage 5 credential readiness implemented on existing `main`, 2026-10-23 GMT+7.
Documentation/tests only; live credentials/settings unchanged. No commit/push.
Stage 2 remains skipped. User reports Stage 3 lifecycle migration already applied;
this stage adds no migration, runtime behavior or API/schema changes.

## Deliverables and validation

- README has seven replacement runbooks with owners, cutover/verification,
  retirement and failure recovery. HANDOFF has timestamped evidence/status/actions.
- 293 offline tests pass; 8 hosted/provider tests skipped. Added 13 credential
  cases using disposable secrets, HTTP mocks and PGlite. Lint and webpack
  production build pass, with external source-map uploads disabled. Formatting
  and final diff checks pass; only documentation/test files changed.
- Session bridge/cutover/retirement tested: cookies last 365 days, no automatic
  renewal. Removing fallback early can lock creators out despite recovery cookie.
  Old deployments and QR previews require coordinated handling; no behavior change.
- Modern Supabase keys exist alongside enabled legacy keys. Local keys are
  legacy-shaped; hidden hosted key types/equality remain unverified. SDK transport
  tests are offline evidence, not proof of hosted acceptance/permissions.
- Sentry old-token revocation/replacement resolved by user confirmation.
- Gemini key FixFirst is owner-identified; Cloud metadata confirms bound account,
  Gemini API restriction, application restrictions None. No settings changed.
- Preview RATE_LIMIT_SECRET is still missing. Owner must separately configure
  a consistent trusted key and redeploy before Preview write verification.
- Hidden credential equality, effective provider permissions and future live
  replacement checks stay unverified. Actual rotations remain future actions.

## Remaining

- Stage 4 cleanup is enabled per last verified worker release b0ba0ac/H8jKFNYNJ;
  daily `0 20 * * *` UTC (03–04 Phnom Penh), Production-only protected worker.
- Prior approved probe removed nothing; 13 future final sweeps remained queued.
  Verify first scheduled invocation, final sweeps after Oct 24 02:30 GMT+7,
  target file absence and an active confirmed receipt opening before closing it.
- No cleanup invocation/provider call/live integration ran during Stage 5.
- Stage 6 broader deployed flows and real-device/screen-reader/Firefox checks.
- Preview shares Production. No isolated backend; Stage 2 remains skipped.
- QR replacement failures lack live-bill orphan retries; documented limitation.
- Privacy/support content and Privacy & Help page remain off the to-do list.
