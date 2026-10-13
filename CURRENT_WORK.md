# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Validate real USD/KHR restaurant and shop receipts after the parser improvements.

## Completed

- Phase 1 bill creation, access, sharing, joining, and participant claiming.
- Manual expense create/edit/remove with equal and exact integer splits.
- Atomic expense/share writes, soft removal, audit events, history, and filters.
- Private receipt image upload with signature/dimension validation.
- Asynchronous extraction adapter with processing, partial, failure, and retry
  states; drafts never affect expense shares.
- Receipt review with editable items/totals, confidence and mismatch warnings,
  participant assignments, adjustment allocation, and atomic confirmation.
- Connected OCR.Space with server-side image resizing, metadata removal, and
  receipt-text parsing.
- Improved quantity/price columns, currency suffixes, split summary labels,
  and selection of totals matching the bill currency on dual-currency receipts.
- Excluded common metadata/payment rows, validated money grouping, and lowered
  confidence for inconsistent quantity/unit-price rows without changing totals.
- Added synthetic USD/KHR layout regressions and adapter-to-review checks.
- Applied all Phase 2 migrations to the hosted `bill-spilter` Supabase project.
- Previously validated hosted manual-expense and receipt transactions.
- Current parser changes pass formatting, lint, 70 tests, and the webpack build;
  5 live-database tests are skipped.

## In Progress

- Real-receipt validation awaits images and live OCR/database configuration.

## Known Problems

- OCR.Space output still depends on heuristic parsing; the new synthetic layout
  coverage does not establish accuracy on real receipt images.
- Turbopack cannot bind its internal port in this environment; webpack passes.
- Missing inputs: real images, OCR_SPACE_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
- OCR drafts remain isolated and do not affect balances unless confirmed.

## Next Step

Obtain representative receipt images and configure the missing keys locally.
Then validate upload, review, and confirmation to assess extraction quality.
Phase 3 balances, transfers, settlements, and owner ABA QR remain unimplemented.
