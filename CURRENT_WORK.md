# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Phase 4: Supabase-backed rate limiting for public live testing.

## Completed

- Private counter/policy migration and service-only atomic consume/cleanup RPCs.
- All actions: 300/min/IP before business queries; authorized operation quotas
  cover bills/people, uploads/completion, expenses/settlements and owner QR writes.
- Extraction v3 claim atomically consumes quotas and assigns attempts; 100/day
  across the app, 10/10min per acting participant and 30/hour per bill.
- Fixed windows use database time; daily reset 00:00 UTC (07:00 Cambodia).
- Duplicate claims do not spend scan quota; failed winning attempts still count.
- App quota denial retains images, persists next_retry_at and offers manual entry.
- Existing attempt guards, 90-second processing and stale retry remain intact.
- Trusted Vercel IP header, normalized HMAC subjects; fixed local development IP.
- Five-second limiter deadline; missing config/store fails closed, bill reads remain.
- Expected denials preserve form values, selected files, reservations and response
  shapes; no automatic retries. Static limiter failures report to Sentry.
- Bounded expired-counter cleanup plus npm run rate-limits:cleanup for idle projects.
- Added offline coverage and opt-in synthetic hosted concurrency checks.
- README/HANDOFF include policies, secret, migration and rollout instructions.

## Validation

- Full suite: 206 offline tests pass; eight live tests skipped.
- Formatting, lint and webpack production build pass.
- User reports both hosted concurrency tests passed (2/2), without Gemini calls.
- User reports migration and secret configuration complete; deployment pending.

## Remaining rollout

- Push the updated main branch and wait for Vercel deployment to finish.
- Keep scanning paused until deployment: migration retires the old v2 claim RPC.
- Verify deployed normal and blocked flows using a fresh test bill.
- Hosted test success verifies Supabase; it does not verify deployed app code.
- Remaining Phase 4: mobile/accessibility, privacy/support, backup/deletion reviews.
