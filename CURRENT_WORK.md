# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Phase 4: Stage 3 lifecycle/permanent deletion implemented locally and tested.
Stage 1 complete; Stage 2 skipped by user. Hosted rollout pending.
Working branch: `work/mobile-accessibility-lifecycle`; keep Production `main` unchanged.

## Implemented locally

- Bills expire after 12 UTC calendar months without a qualifying successful change.
  Reads/failures/retries/background processing do not renew them; inline expiry
  dates and a final-30-day warning are shown. No grace/undo at automatic expiry.
- Draft receipts expire at 24 hours. Confirmed images remain until bill deletion;
  expense cards link to receipts and old missing images have an accessible fallback.
- Creator-device deletion requires session/recovery cookies and typing DELETE.
  SQL atomically queues file cleanup and removes dependent app/scoped-quota rows;
  other bills/global/IP quotas remain. Only this bill's cookies are cleared.
- Private retry jobs sweep receipt/QR/staging folders, including orphan/nested files.
  Five-minute leases/retries and a final 24-hour sweep handle failures/late uploads.
- `npm run lifecycle:cleanup` defaults to count-only dry-run; apply requires
  `-- --apply --project-ref <matching-project-ref>`. Bounded batches; no scheduler.
- Migration `20261022000000_bill_lifecycle.sql`: **NOT APPLIED to hosted Supabase**,
  explicitly confirmed by the user on 2026-10-22. User applies it after rate limiting.
- Mobile/accessibility and lifecycle work saved together; not released to Production.
  Automatic Preview builds do not apply SQL and are not ready for hosted validation.

## Validation

- 243 offline tests pass; eight hosted/provider tests skipped. PGlite and mocked
  Storage cover lifecycle, authorization, batches, failures and race interleavings.
- 10 new offline lifecycle browser checks pass: Chromium/WebKit desktop, 320px
  Chromium, Android/iPhone emulation; keyboard/error/pending/fallback/axe/reflow.
- Formatting, lint and webpack production build pass; source-map uploads disabled.
- No Production data tests, cleanup, migration, deployment or credential changes.

## Remaining

- Do not merge/promote this branch yet. Follow coordinated maintenance → drain old callbacks → user SQL
  → deploy/promote → verify → reopen sequence. Old code deletes confirmed images.
- Stage 4: decide/run cleanup routine and hosted rehearsal; no automatic worker yet.
- Real iPhone/Android, VoiceOver/TalkBack/manual keyboard and working-host Firefox.
- Credential rotation and deployed normal/blocked-flow checks remain pending.
- Production still `32355c4`; Local/Preview/Production share `uvznqgkbodejvksmtafh`.
  Preview RATE_LIMIT_SECRET is missing; account free-project limit blocks a test project.
- Privacy/support content and the Privacy & Help page remain off the to-do list.
