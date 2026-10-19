# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Prepare private image uploads and receipt processing for Vercel live testing.

## Completed

- Existing bill, expense, settlement and dual-currency owner QR features retained.
- Shared prepare/complete actions; original receipt/QR images upload directly
  from the browser to private Supabase staging with the existing 10 MB cap.
- Server-only reservations bind bill/participant/purpose; completion accepts
  only the upload UUID, rechecks access, and validates actual image bytes.
- Creator session/recovery key required for owner QR preparation and completion.
- Stable receipt scan IDs, atomic completion, one extraction schedule per upload;
  QR inspection still requires explicit recipient/currency confirmation to save.
- Clear preparation/upload/processing states; failures retain selected files.
- Application completion expires in 15 min; storage tokens in 2 hours, no overwrite.
- Bounded cleanup of 20 reservations older than 24 hours plus private operator
  command npm run uploads:cleanup. No scheduled cleanup worker yet.
- Node.js/maxDuration 120 on bill/review pages. Gemini timeout 60 seconds;
  overall extraction processing deadline 90 seconds plus bounded claim/failure.
- Retry stale scans after 150 seconds; attempt IDs guard late success/failure.
- New regressions cover large uploads, auth, expiration, duplicates, corruption,
  interrupted requests, cleanup, timeouts, stale attempts and retained file input.
- README includes migration, cleanup, Vercel configuration and smoke-test steps.

## Validation

- Formatting, lint, 176 unit/database tests and webpack production build pass.
- Six live tests are skipped; build manifest confirms both 120-second limits.
- Hosted upload/browser/real-QR tests and Vercel deployment remain outstanding.

## Required Migration

User applies missing migrations in order: 20261017000000 (Phase 3),
20261019000000 (dual currency), then 20261020000000_direct_image_uploads.sql.
User reports the new migration was applied. Hosted verification is pending.
It retires unguarded worker RPCs; restart/deploy updated code before processing.

## Next Step

Deploy a Vercel preview and run opt-in
npm run test:e2e:uploads and npm run test:e2e:phase3. Use the EXISTING Supabase
project and fresh bills on a stable Vercel preview hostname; enable Fluid compute.
