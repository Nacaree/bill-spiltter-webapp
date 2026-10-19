# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Support ABA QRs that let payers choose KHR or USD during owner QR inspection.

## Completed

- Phase 1 access and Phase 2 manual/receipt expenses; USD/KHR only.
- Phase 3 balance explanations, transfers, audited/idempotent settlements,
  private owner QR storage, signed URLs and creator-only settings.
- Fixed the reported KHR-default QR rejection on a USD bill: amount-free QRs
  now reach preview even when their encoded currency differs from the bill.
- Preview shows encoded currency and lets the owner confirm KHR + USD based
  on actual banking-app options. No automatic dual-support inference.
- Accepted currencies must include the bill currency. Fixed-amount QRs remain
  restricted to one encoded currency and exact amount, including DB checks.
- New v2 save RPC stores accepted currencies; existing records/RPC preserved.
- Re-uploading the same QR can correct its accepted-currency selection.
- Payers are prompted to select the bill currency in their banking app.
- Added regressions for preview/save, currency choices, tampering, persistence,
  default currency mismatch, fixed amounts, access and existing RPC compatibility.
- Updated the opt-in browser flow to use a KHR-default QR on a USD bill.

## Validation

- Focused QR/server/PostgreSQL checks: 22 tests passed.
- Formatting, lint, 148 tests and webpack production build passed.
- Hosted browser and real dual-currency QR validation remain outstanding.

## Required Migration

Apply 20261019000000_dual_currency_payment_qrs.sql from supabase/migrations
AFTER 20261017000000_phase_3_settlements.sql. Neither hosted application has
been confirmed. The user applies hosted migrations themselves; provide files
and instructions. Never rerun a migration already applied to that project.

## Next Step

Finish local checks, then have the user apply the new migration, refresh, and
re-inspect their QR. Choose KHR + USD after checking the bank's currency options.
Run npm run test:e2e:phase3 after both migrations are applied. Inspect the real
QR result; saving/viewing a QR must never record a settlement automatically.
