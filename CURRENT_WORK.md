# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Phase 3: balances, settlements, and owner ABA QR.

## Completed

- Phase 1 bill access, sharing, joining, sessions, and participant claiming.
- Phase 2 manual expenses and Gemini receipt review/atomic confirmation.
- USD/KHR restrictions and editable quantity/unit-price persistence.
- User validated the supplied real receipt and confirmed the resulting expense.
- Phase 3 derived balances use one database snapshot; include explanations,
  contributing expenses, inactive participants, and deterministic transfers.
- Full/partial payment recording, correction, and confirmed removal; atomic
  audit, duplicate-submission protection, and stale-edit rejection.
- Owner-only QR inspection/confirmation, private upload/replacement/removal;
  requires creator session and recovery cookie. No cross-device recovery yet.
- KHQR validation/cropping, recipient and USD/KHR review, fixed amount/expiry
  checks; QR shown only for matching owner transfers. Viewing never records pay.
- Signed QR view/download URLs expire within 60 seconds; preview tokens in 10 min.
- Offline PostgreSQL tests apply all migrations and check transactions/access.
- Formatting, lint, 140 tests, and webpack production build passed.
- Added opt-in browser flow covering create/join/expense/QR/settle/correct/remove.

## In Progress

- Hosted migration confirmation and browser validation remain.

## Known Problems

- Hosted application of 20261017000000_phase_3_settlements.sql is unconfirmed.
  The app displays a setup message until the migration is applied.
- Normal tests skip 6 live API/database tests. Hosted Phase 3 browser test is
  not run yet; local PostgreSQL tests passed. Docker is not required.
- Build needs Google Fonts network access; webpack build passed with access.

## Next Step

Confirm whether the user applied the new migration from supabase/migrations
in Supabase SQL Editor, then refresh the bill. After it is applied, run
npm run test:e2e:phase3 and check real owner QR behavior. User explicitly wants
migration files provided and to apply hosted migrations themselves.
