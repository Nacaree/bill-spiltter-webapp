# Bill Splitter — Computer Handoff

Read this file and `CURRENT_WORK.md` when resuming on another computer. Current
branch: `main`; baseline commit: `ea3d1f2`. Currency restrictions are uncommitted.
Commit and push them before expecting those changes on another computer.

## Current state

Phase 1 and the Phase 2 manual expense ledger and receipt review flow are built.
Bill creation, money handling, receipt parsing, and Gemini accept only USD/KHR.
Production receipt extraction now calls Gemini directly with the image and a
JSON schema. Zod validates the output; every AI item remains flagged for review.
The private upload, retry, review, and atomic confirmation flow is retained.
Totals fields wrap to fit the panel. Reconciliation includes tax, tip, and
discount and updates when edited; an expected discount is not a mismatch.
Receipt items show editable unit price between description and line total.
Changing it recalculates the line total using the scanned quantity (shown below
the price). Confirmation saves both quantity and unit price in its transaction.
Migration `20261013000000_preserve_receipt_unit_prices.sql` was applied via the
hosted SQL editor, and its persistence/idempotence check passed with test data.
OCR.Space keys are no longer used. Its text-parser tests remain as references.

The user supplied one Cambodian receipt photo with partially obscured labels.
Visible amounts: USD subtotal 149.75, discount 24.00, total 125.75; equivalent
riel total 521,900. The fixture is a manual transcription, not model output.
Real-photo Gemini accuracy has not yet been verified. Phase 3 is not started.

Validation passed: formatting, lint, 119 unit tests, webpack production build,
and a live Gemini request with the configured key. The live generated receipt
returned correct quantities, item prices, subtotal, discount, and USD total.
Google briefly reported high demand; a later retry succeeded. Normal tests
skip live API/database calls (6 tests), and Gemini was checked separately.
The totals and unit-price layouts were visually checked with production CSS at
panel widths of 320px, 560px, and 840px.

## Configuration and startup

Create a private `.env.local` on each computer using `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`: hosted project API URL, not its dashboard link.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`: matching keys
  from that same project. The service-role key stays server-only.
- `PARTICIPANT_SESSION_SECRET`: at least 32 random characters.
- `GEMINI_API_KEY`: server-only key from Google AI Studio.
- `GEMINI_RECEIPT_MODEL`: optional; defaults to `gemini-3.1-flash-lite`.
- Leave `RECEIPT_EXTRACTION_DEV_FIXTURE` blank to use the real provider.

The current computer points to hosted Supabase and has a Gemini key configured.
The hosted backend is already managed by Supabase; no Docker is needed. Never
commit `.env.local` or share secret values in chat.

```bash
npm ci
npm run dev
```

Open the frontend at `http://localhost:3000`, and the backend in the Supabase
dashboard. Restart the frontend after editing `.env.local`.

## Transfer and verification

Before switching computers, inspect and commit the current work:

```bash
git status --short
git add HANDOFF.md CURRENT_WORK.md README.md .env.example package.json \
  src/lib/bill-input.js src/lib/money.js tests/bill-input.test.js tests/money.test.js \
  src/env.js src/lib/receipt-extraction.js src/lib/receipt-text-parser.js \
  src/components/receipt-review-form.jsx \
  src/lib/receipt-item-price.js src/lib/receipt-input.js src/server/receipts.js \
  'src/app/b/[shareToken]/receipts/[receiptScanId]/page.jsx' \
  tests/receipt-extraction.test.js tests/receipt-text-parser.test.js \
  tests/components/receipt-review-form.test.jsx \
  tests/receipt-item-price.test.js tests/receipt-input.test.js \
  tests/integration/phase-2-receipts.integration.test.js \
  supabase/migrations/20261013000000_preserve_receipt_unit_prices.sql \
  tests/integration/gemini-receipt.integration.test.js \
  tests/fixtures/cambodia-receipt-visual-transcription.json
git diff --cached --check
git commit -m "Restrict bill and receipt currencies to USD and KHR"
git push
```

On the next computer, use the same branch and a clean checkout, then:

```bash
git pull --ff-only
npm ci
npm run format:check
npm run lint
npm run test
npm run build -- --webpack
```

The optional `npm run test:integration:gemini` sends only a generated receipt,
requires the local Gemini key, and consumes API quota. Normal tests skip live
API/database calls. Consult README for Gemini free-tier data-use terms.

## Resume product validation

Upload the supplied receipt and compare Gemini’s draft against its printed
items, quantities, subtotal, discount, and USD total. Correct unreadable labels
before assigning items and confirming the expense. Check that drafts create no
expense shares, confirmation creates one expense, and shares add up to its total.
Store receipt photos in ignored `local-data/receipt-samples/` when needed.
