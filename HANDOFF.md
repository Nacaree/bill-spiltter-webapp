# Bill Splitter — Computer Handoff

Use this file to resume work on another computer. The source computer is on
branch `main`, at `31c8dff` (`phase 2 WIp, OCR is gay`) with uncommitted receipt
parser work. Transfer those changes before expecting them on another computer.

## Current state

Phase 1 and the Phase 2 manual expense ledger and receipt review flow are
implemented. The current work improves heuristic OCR.Space parsing for USD/KHR
restaurant and shop receipts. It covers quantity/price columns, currency
suffixes, split summary labels, dual-currency totals, malformed amounts, and
common metadata rows. These changes have synthetic layout fixtures; they have
not been validated against real receipts. Phase 3 balances and settlements have
not started.

The parser changes passed formatting, lint, 70 tests, and `npm run build --
--webpack`. Five live database tests were skipped. Turbopack could not bind a
port in the source environment, so the verified production build used Webpack.

## Transfer the work

On the source computer, inspect the changes and commit the handoff with the
parser work before switching machines:

```bash
git status --short
git add HANDOFF.md CURRENT_WORK.md README.md .gitignore \
  src/lib/receipt-text-parser.js \
  tests/receipt-extraction.test.js tests/receipt-text-parser.test.js \
  tests/fixtures/receipt-text-layouts.json
git diff --cached --check
git commit -m "Improve USD and KHR receipt parsing"
git push
```

On the other computer, in the same repository and branch:

```bash
git pull --ff-only
npm ci
npm run format:check
npm run lint
npm run test
npm run build -- --webpack
```

Use a separate local `.env.local` on each computer. Follow the setup steps in
`README.md`; obtain project keys through the team's approved secret store or
Supabase dashboard. Never commit or send `.env.local` or secret values through
chat. The source computer currently has no `OCR_SPACE_API_KEY` or
`SUPABASE_SERVICE_ROLE_KEY`, so live receipt validation cannot run until the
needed local settings are configured.

## Resume receipt validation

Collect a few representative USD/KHR receipt images, then test upload, OCR,
review, and confirmation. Check merchant, date, item descriptions, quantities,
unit prices, subtotal, tax, tip, discount, currency, and total against each
printed receipt. Record mismatches without confirming a draft until its values
are corrected. Use the results to decide whether the parser needs more fixes or
OCR.Space should be replaced with a structured receipt provider.

Keep receipt samples local and out of Git unless the owner has approved sharing
them and they have been scrubbed of personal and payment information.
