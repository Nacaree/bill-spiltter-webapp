# Bill Splitter — Computer Handoff

Read this file and `CURRENT_WORK.md` when resuming. Branch: `main`.
Phase 3 implementation is included in this checkout; use `git log -1` for the
latest commit. Pull `main` and run `npm ci` when moving to another computer.
The user wants migration SQL saved in `supabase/migrations/` and will apply
hosted migrations themselves. Tell them when a new migration is required.

## Vercel preparation (2026-10-20)

Direct browser uploads are implemented for receipts and owner QR originals.
`prepareImageUploadAction` accepts metadata and issues a path-scoped token;
`completeImageUploadAction` accepts only an upload UUID and rechecks access.
Private reservations bind bill/participant/purpose and expire in 15 minutes.
Supabase signed upload tokens last two hours, with overwrites disabled. Original
images keep the 10 MB cap and are validated from stored bytes. Receipt completion
creates one stable scan and schedules processing only for the winning write.
QR inspection retains the existing signed cropped preview/confirmation flow.
Failed uploads retain the selected file. Browser server-actions no longer accept
original receipt/QR files; cropped QR confirmations remain below the 4 MB action
body limit. Internal file helpers remain for server-side integration fixtures.

The bill/review pages use Node.js and maxDuration 120. Extraction has a 90-second
processing deadline; claim/failure requests are bounded separately to 10 seconds.
Gemini retains its 60-second request timeout. Stale uploaded/processing scans
can be retried after 150 seconds. New attempt IDs guard success and failure
writes against stale workers. The old unguarded extraction RPCs are retired.
`after()` remains best-effort invocation work, not a durable queue.

Apply `supabase/migrations/20261020000000_direct_image_uploads.sql` AFTER the
other migrations below, with no extraction in flight, then run updated code.
The user reports this migration was applied; hosted verification is pending.
Never apply migrations on the user's behalf.
A code-only rollback to an older receipt worker is incompatible with this schema.

Request-time cleanup handles up to 20 reservations older than 24 hours. Valid
QR originals remain temporarily for retry; successful receipt staging and
validation failures are removed promptly. Idle projects need the private
`npm run uploads:cleanup` command; repeat until zero. No scheduled worker exists.

The user chose the EXISTING Supabase project for initial Vercel tests, using
fresh test bills. Follow README's Vercel live testing instructions: Node 22,
webpack build, matching Preview environment variables, Fluid compute enabled,
stable branch preview URL, and a new bill on that hostname. The agent has not
configured/deployed Vercel or run hosted browser tests. Formatting, lint, 176
unit/database tests and the webpack production build pass; six live tests are
skipped. The build manifest confirms both 120-second route limits.
New opt-in test: `npm run test:e2e:uploads`.

## Current state

Phase 1 access and Phase 2 manual/receipt expenses are built. The user configured
Gemini on this computer, checked the real receipt draft, assigned items, and
confirmed the expense successfully. That product validation is user-reported.
USD/KHR only. The retained Cambodian fixture is still a manual transcription.
Receipt confirmation preserves quantity/unit price; migration
`20261013000000_preserve_receipt_unit_prices.sql` was previously applied hosted.

Phase 3 code is implemented:

- A single-snapshot ledger derives zero-sum balances from confirmed expenses,
  shares and settlements. Filters do not affect balances. Inactive people retain
  balances. Each person can inspect their expense contributions and totals.
- Deterministic debtor/creditor matching suggests transfers. It reduces payment
  complexity but does not guarantee a globally minimal number of transfers.
- Joined participants can record actual full/partial payments, correct them,
  and remove mistaken records. All changes are transactional and audited.
  Creation has submission UUID idempotence; changes reject stale versions.
- Creator session plus creator recovery cookie controls owner QR settings.
  Inspect a JPEG/PNG, review decoded recipient/currency, then save or replace.
  Server validates KHQR CRC/fields, crops the image and detects multiple codes.
  USD/KHR KHQR is supported; legacy ABA URL QRs are rejected.
  Owner preview tokens bind image/bill/owner and expire in ten minutes.
- Payment images use private `payment-qrs` storage. View/download URLs last at
  most 60 seconds. Only current owner-directed suggested transfers with matching
  currency, fixed amount and expiry can display the QR. Viewing never records
  payment. Bank transfers and confirmation remain manual.
- Activity includes settlement and QR changes without logging decoded payloads.

## Required hosted migration — application unconfirmed

`supabase/migrations/20261017000000_phase_3_settlements.sql`

The user has not confirmed applying this migration. If it is not applied yet,
tell them to open their project's SQL Editor, paste the complete file, and
run it once. The file includes BEGIN/COMMIT. It adds settlement/payment-method
schema, RPCs, permissions and private storage, preserving existing expenses.
Until applied, the app displays a balances/payments setup message.
Do not apply hosted migrations for the user; they explicitly requested to do it.
This updates the hosted project once, not once per computer.

Also apply `supabase/migrations/20261019000000_dual_currency_payment_qrs.sql`
after the original Phase 3 migration. This new migration is NOT applied by the
agent. It preserves existing rows and adds a v2 save RPC plus constraints for
one or two accepted currencies, with fixed amounts restricted to one currency.

## Dual-currency QR correction

The user reported that an ABA QR offering KHR/USD was rejected with "This QR
uses KHR. Upload a USD QR for this bill." The parser could read the QR but the
preview incorrectly required the encoded/default currency to equal the bill.
Amount-free QRs now reach preview even if that default differs. The owner
chooses encoded-currency only or confirms KHR + USD after checking their banking
app. Never infer dual support just from tag 53. The signed image and decoded
metadata are retained; accepted currencies must include the bill currency.
Fixed-amount QRs cannot choose both currencies. Re-uploading the same QR can
correct its selection. Payers are prompted to choose the bill's currency.
No real bank QR or hosted browser flow has been validated for this change yet.

## Expected bill page

After migration, a Balances & payments section appears below People, with each
person's Owes / Is owed / Settled status and an expandable balance explanation.
Nonzero balances produce suggested transfers. Joined participants can record
payments and correct or remove records in Payment history. Zero balances show
an all-settled state without suggested transfers. Owner ABA QR settings appear
on the creator's device; Pay with ABA QR appears only after a suitable owner QR
is saved and an eligible transfer is owed to that owner.

## Validation

- Before Vercel preparation, formatting, lint, 148 tests and webpack build
  passed. Current results are recorded in CURRENT_WORK.md.
- Normal tests skip 6 live API/database checks and do not use Gemini quota.
- Offline PGlite PostgreSQL tests apply every migration and cover settlement
  idempotence, corrections, deletion, zero-sum balances, cross-bill/session checks,
  owner credentials, QR replacement/removal, permissions, and private storage.
- Bitmap QR tests cover decode/crop, corrupt/blank/multiple symbols, CRC,
  precision, expiry, eligibility and signed-preview tampering.
- Repository checks verify short-lived QR access never writes a settlement.
- The new Phase 3 browser test is discovered but NOT run: hosted migration is
  pending. Run `npm run test:e2e:phase3` after the user applies it. The test uses
  synthetic data and a non-payable QR, then cleans up its bill/image.
- Production build required network access to fetch the existing Google font.
  Hosted Phase 3 and real owner QR validation remain unverified.

## Configuration and startup

Create private `.env.local` from `.env.example` on each computer. Use matching
hosted Supabase URL/anon/service-role keys, a 32+ character participant session
secret, and a server-only Gemini key. Never commit or print secret values.
`GEMINI_RECEIPT_MODEL` defaults to `gemini-3.1-flash-lite`.
Leave `RECEIPT_EXTRACTION_DEV_FIXTURE` blank for the real provider.

```bash
npm ci
npm run dev
```

Frontend: `http://localhost:3000`. Hosted Supabase needs no Docker. Restart after
changing environment variables. For code checks:

```bash
npm run format:check
npm run lint
npm run test
npm run build -- --webpack
```

## Resume

1. Confirm all three recent migrations are applied, including direct uploads.
   Restart the updated app, then refresh the bill.
2. Run `npm run test:e2e:uploads` and `npm run test:e2e:phase3` after migration,
   using a dedicated local test server. Fix any browser/hosted issues.
3. Have the owner upload their real amount-free ABA KHQR and confirm the decoded
   recipient/currency. Check it only appears for eligible owner transfers.
4. Validate partial/full payments, corrections and removal; confirm all-settled
   appears only when every net is zero. These record payments already made.
5. Continue with Phase 4 hardening after hosted and real-QR validation pass.
