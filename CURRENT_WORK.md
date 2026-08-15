# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Pause Phase 2 after validating the manual ledger and identifying receipt OCR
quality problems.

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
- Applied all Phase 2 migrations to the hosted `bill-spilter` Supabase project.
- Formatting, lint, focused fixture/unit coverage, live manual-expense and
  receipt transaction checks, and the webpack production build pass.

## In Progress

- No active implementation work; receipt OCR improvements are deferred.

## Known Problems

- OCR.Space recognizes text, but structured merchant, item, and total extraction
  is unreliable on real receipts because it depends on heuristic text parsing.
- OCR drafts remain isolated and do not affect balances unless confirmed.

## Next Step

Later, improve parsing using representative receipt samples or replace
OCR.Space with a receipt-specific structured extraction provider.
