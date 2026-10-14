# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Restrict the app to USD and KHR.

## Completed

- Phase 1 bill creation, sharing, joining, sessions, and participant claiming.
- Manual expense create/edit/remove with equal/exact integer splits and audit.
- Private image upload, background extraction, retries, editable receipt review,
  item assignments, adjustment allocation, and atomic confirmation.
- Gemini adapter reads the receipt image directly, requests a JSON schema, and
  validates fields with Zod. Images are resized, oriented, and stripped of metadata.
- Every Gemini item remains flagged for review; drafts never affect the ledger.
- Missing, malformed, blocked, truncated, and failed responses fail safely.
- GEMINI_API_KEY and optional GEMINI_RECEIPT_MODEL replace OCR.Space configuration.
- Bill creation, money handling, receipt parsing, and Gemini support USD/KHR only.
- Gemini key verified: live generated receipt returned correct item quantities,
  prices, subtotal, discount, and USD total; all items remain reviewable drafts.
- Receipt fields wrap to fit panel width. Editable totals reconcile items plus
  tax/tip minus discount and flag only genuine discrepancies or invalid values.
- Verified totals and unit-price layouts at 320px, 560px, and 840px widths.
- Editable unit prices update line totals using the scanned quantity, with
  integer rounding for fractional quantities. Unknown prices remain blank.
- Confirmation preserves quantity and unit price atomically; migration
  20261013000000 was applied on hosted Supabase and verified with a test receipt.
- Formatting, lint, 119 unit tests, and webpack build pass. Normal tests skip
  5 live-database tests and the opt-in Gemini test; Gemini passed separately.
- Uses hosted Supabase; Docker is not required.

## In Progress

- Real-photo review through the hosted app remains.

## Known Problems

- The supplied photo has obscured item names. Live extraction accuracy on that
  photo has not been measured; the retained fixture is a manual transcription.
- Turbopack could not bind its internal port here; use the webpack build check.

## Next Step

Restart the frontend and upload the supplied receipt with Gemini enabled.
Compare the draft against the printed receipt and correct unknown fields before
confirming. Phase 3 balances, settlements, and owner ABA QR are still ahead.
