# Bill Splitter

Bill Splitter is a planned responsive web app for creating a shared bill, adding people and expenses, calculating fair shares, and settling up—without requiring anyone to create an account.

## Local development

### Prerequisites

- Node.js 22 or newer and npm
- A hosted Supabase project (the backend runs on Supabase)
- A Gemini API key for receipt scanning
- Docker Desktop and the Supabase CLI only if you choose a local database

### Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Copy your hosted Supabase project API URL, anonymous key, and service-role key
into `.env.local`; all three must belong to the same project. Use the API URL,
not the dashboard link. The hosted backend needs no local startup command.
For a fresh project, apply the schema files in `supabase/migrations` first.
The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.
Replace `PARTICIPANT_SESSION_SECRET` with a
random value containing at least 32 characters; for example, generate one with
`openssl rand -base64 32`. Set the server-only `GEMINI_API_KEY` using a key from
[Google AI Studio](https://aistudio.google.com/apikey). Receipt extraction defaults
to `gemini-3.1-flash-lite`; `GEMINI_RECEIPT_MODEL` can select another compatible
image/structured-output model. Restart `npm run dev` after changing environment
variables. Open the frontend at [http://localhost:3000](http://localhost:3000)
and manage the backend in the [Supabase dashboard](https://supabase.com/dashboard).

For an optional local backend, start Docker Desktop and run `npx supabase start`.
Use the local URL and matching local keys in `.env.local`; local Studio is at
[http://localhost:54323](http://localhost:54323).

Gemini free-tier quotas depend on the model and project. Google’s
[pricing and data-use terms](https://ai.google.dev/gemini-api/docs/pricing)
state that free-tier content may be used to improve its products. Use redacted
test receipts when evaluating that tier.

Environment variables are validated at startup. Keep server secrets out of variables prefixed with `NEXT_PUBLIC_`; those variables are included in browser bundles.

### Quality checks

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

After connecting Supabase and applying the migrations, run the complete Phase 1
two-browser flow explicitly:

```bash
npm run test:e2e:supabase
```

The Supabase-backed tests are skipped during the normal browser suite so they
cannot accidentally write test bills to an unconfigured or shared project.

Run a live Gemini extraction check using a generated receipt (no customer data):

```bash
npm run test:integration:gemini
```

This check requires `GEMINI_API_KEY` in `.env.local` and consumes API quota. It is
skipped in the normal test suite.

GitHub Actions runs formatting, linting, unit tests, and a production build for
pull requests. Vercel should be connected to the repository for deployment
previews and configured with the four required variables in `.env.example`.
Preview and production Supabase projects must remain separate, with matching
project keys configured per Vercel environment.

## Product direction

The product should be **bill-first, not account-first**. A visitor can start immediately by naming a bill and entering their own name. The resulting bill page is the center of the experience: it contains participants, expenses, balances, settlement suggestions, and a shareable link.

Accounts, sign-in screens, email verification, and invitations are intentionally excluded from the MVP. Possession of the bill's private, unguessable link grants access to it, similar to a shared document. The UI must clearly explain that anyone with the link can view and change the bill.

### Product goals

- Let a first-time visitor create a bill in under a minute.
- Require only a bill name and the creator's display name to begin.
- Let other people join from a link by entering their name—no registration.
- Turn an uploaded receipt image into editable bill items without manual re-entry.
- Keep every expense, balance, and settlement easy to understand.
- Support common split methods without complicating the default equal split.
- Minimize the number of payments needed to settle a bill.
- Preserve bill access on the same device without collecting account credentials.

## Core user experience

### 1. Create a bill

The landing page has one primary action: **Create a bill**.

Required fields:

- **Bill name**, such as “Beach weekend” or “Apartment utilities”.
- **Your name**, used to create the first participant and identify expenses paid by the creator.

Optional fields:

- Currency: USD or KHR, defaulting to USD.

On submission, the server creates the bill and its first participant in one transaction, stores a participant session on the device, and redirects directly to the bill page.

### 2. Use the bill page

The bill page shows:

- Bill name, currency, and share action.
- Participants and an **Add person** action.
- Expenses with payer, amount, participants, and split method.
- Each person's current “owes” or “is owed” total.
- Suggested transfers and recorded settlements.
- Recent activity so changes can be understood.

The first empty state should offer **Upload receipt** and **Add manually** rather than leading through configuration.

### 3. Share and join

The creator copies a private bill link and sends it through any messaging app. A new visitor opening that link can:

1. View the bill.
2. Select an existing participant if that participant is not already claimed on another device, or enter a new display name.
3. Continue as that participant without creating an account.

A signed, HTTP-only participant session cookie remembers the selected participant on that device. Display names are labels, not passwords or secure identities, so sensitive information should not be placed in a bill.

### 4. Upload a receipt

From the bill page, **Upload receipt** opens the normal file picker for a JPEG, PNG, or HEIC image. The app does not request device hardware permissions. The server extracts the merchant, date, currency, line items, subtotal, tax, tip, discounts, and total.

OCR is only a draft. Before anything affects balances, the user reviews the result and can:

1. Correct, add, or remove line items and prices.
2. Check that the extracted total matches the printed receipt.
3. Choose who paid.
4. Assign each item to one or more participants; shared items split equally by default.
5. Choose how receipt-level tax, tip, discounts, and rounding differences are distributed.
6. Confirm the import and add it to the bill.

The review screen clearly highlights low-confidence fields and any mismatch between the itemized calculation and the receipt total. A failed extraction falls back to the normal manual expense form with any successfully extracted values preserved.

### 5. Add and split an expense manually

From the bill page, a participant enters a description, amount, payer, and included people. Equal split is the default, and exact amounts are available when people owe different shares. The user reviews the calculated shares before saving.

### 6. Settle up

The balances view explains who owes whom and suggests a small set of transfers. The bill owner can upload an ABA QR image from bill settings. When a suggested transfer is payable to the owner, the payer can open **Pay with ABA QR**, verify the recipient, currency, and amount, then display or download the QR for use with their banking app.

Payments still happen outside the app. Showing or opening a QR never marks a balance as paid: after transferring, a participant records the payment on the bill and balances update immediately. If a settlement is payable to another participant, the owner's QR is not shown for that transfer.

## Proposed tech stack

The MVP should be one modern JavaScript application backed by managed PostgreSQL.

| Area                 | Choice                                                         | Why                                                                                                          |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Web framework        | **Next.js App Router + JavaScript**                            | Full-stack React, server rendering, route handlers, and one deployable project without TypeScript.           |
| UI                   | **Tailwind CSS + shadcn/ui**                                   | Fast, accessible UI development with project-owned components.                                               |
| Forms and validation | **React Hook Form + Zod**                                      | Shared runtime validation in the browser and on the server.                                                  |
| Database             | **PostgreSQL via Supabase**                                    | Transactions fit expense ledgers; managed PostgreSQL provides migrations and backups.                        |
| Data access          | **Supabase JavaScript client, server-side only for bill data** | Keeps database credentials and access rules away from the browser.                                           |
| Receipt extraction   | **Server-side OCR adapter with structured-output validation**  | Keeps provider credentials private and allows the OCR service to be changed without rewriting the bill flow. |
| Receipt storage      | **Private object storage with short-lived signed access**      | Receipt images may contain sensitive information and must never be public.                                   |
| Payment QR storage   | **Private object storage with short-lived signed access**      | Prevents the owner's ABA QR from becoming a public asset while allowing bill members to view it.             |
| Anonymous sessions   | **Signed HTTP-only cookies**                                   | Remembers a participant on a device without requiring an account.                                            |
| Money arithmetic     | **Integer minor units**                                        | Storing cents as integers avoids floating-point errors.                                                      |
| Testing              | **Vitest + Testing Library + Playwright**                      | Covers calculations, components, and complete browser journeys.                                              |
| Hosting              | **Vercel + Supabase**                                          | Low-operations deployment with preview environments and managed backups.                                     |
| CI/CD                | **GitHub Actions**                                             | Runs formatting, linting, unit tests, and build checks on every pull request.                                |
| Observability        | **Sentry after MVP**                                           | Adds client/server error reporting once real users arrive.                                                   |

### Architecture principles

1. **No account dependency:** creating, joining, and settling a bill must never redirect to sign-up.
2. **Server-authoritative calculations:** validate and calculate shares on the server in a database transaction.
3. **Capability-link access:** a long, random public identifier acts as the bill access capability and must never be sequential or guessable.
4. **Participant sessions:** use a separate signed participant token so the device can be remembered without treating a display name as authentication.
5. **Derived balances:** calculate balances from expenses, shares, and settlements; never store a mutable balance as another source of truth.
6. **Ledger-style history:** retain an activity trail for financial changes and exclude soft-deleted records from calculations.
7. **Currency-safe data:** use one currency per bill in the MVP and store all values as integer minor units.
8. **Accessible by default:** keyboard navigation, semantic controls, focus states, contrast, and screen-reader labels are acceptance criteria.
9. **Human-confirmed extraction:** OCR output is untrusted draft data and never changes balances until a participant reviews and confirms it.
10. **Payments stay external:** payment QRs are a convenience only; the app never requests a banking PIN, initiates a transfer, or treats viewing a QR as payment confirmation.

## Feature scope

### MVP

#### Bills and participants

- Create a bill with only a bill name and creator name.
- Open a bill through a private, unguessable share link.
- Add, rename, and deactivate participants.
- Join or return to a bill without an account.
- Copy or share the bill link from the bill page.
- Archive or permanently delete a bill using its creator recovery key.
- Display a warning that anyone with the link can access the bill.
- Let the bill owner upload, replace, or remove one ABA QR image.
- Show the owner's payment details only to people who already possess the private bill link.

#### Expenses

- Add an expense with description, date, category, payer, amount, and participants.
- Upload a JPEG, PNG, or HEIC receipt image from the bill page using the normal file picker.
- Extract merchant, date, line items, quantities, prices, subtotal, tax, tip, discounts, and total into a reviewable draft.
- Highlight uncertain values and total mismatches; require review before importing.
- Edit extracted items and assign each item to one or more participants.
- Split shared items equally and distribute tax, tip, discounts, and rounding adjustments using an explicit method.
- Save a confirmed receipt as one expense whose participant shares are derived from its item assignments.
- Retry or fall back to manual entry without losing extracted values when extraction is incomplete.
- Split equally or by exact amount.
- Validate that shares add up exactly to the expense total.
- Edit or remove an expense with a visible activity entry.
- Filter expenses by participant or category.

#### Balances and settlements

- Show how much each participant owes or is owed.
- Explain which expenses contribute to a balance.
- Suggest transfers that reduce the number of payments.
- Show **Pay with ABA QR** when the suggested recipient is the bill owner and an ABA QR is configured.
- Show the exact amount and bill currency beside the QR, while requiring the payer to verify the recipient and amount in their banking app.
- Record a payment made outside the app.
- Show when the bill is completely settled.

#### Product quality

- Responsive layouts for phone, tablet, and desktop.
- Empty, loading, validation, expired-link, and error states.
- Confirmation for destructive actions.
- Automated coverage for money, splitting, access tokens, and session behavior.

### After MVP

- Optional accounts for syncing bills across devices and recovering access.
- Optional bill passcodes or approval-only joining.
- PDF and multi-page receipt imports.
- Automatic item categorization and participant suggestions from prior bills.
- Receipt scanning in additional writing systems after accuracy validation.
- Recurring expenses and reusable split templates.
- Multiple payers for a single expense.
- Multi-currency bills with explicit exchange rates.
- Email/push reminders, CSV export/import, and printable summaries.
- Offline-first expense capture or a progressive web app.

### Explicitly out of scope for MVP

- Mandatory accounts, sign-in, email verification, or OAuth.
- Moving money in the app or collecting raw bank/card credentials separately from the owner-provided payment QR.
- Automatically confirming ABA payments or reading the owner's bank transaction history.
- Automatic bank transaction imports.
- Live currency conversion.
- Complex accounting, tax, or reimbursement workflows.
- Public bill discovery.

## Database design

All primary keys are UUIDs. Timestamps use `timestamptz` in UTC. Monetary columns ending in `_minor` hold integer minor units; for example, USD 12.34 is stored as `1234`.

### Entity relationships

```text
bills ──< bill_participants
  │              │
  ├──< bill_payment_methods
  ├──< receipt_scans ──< receipt_items ──< receipt_item_assignments
  ├──< expenses ─┴─< expense_shares
  ├──< settlements
  └──< activity_log
```

### `bills`

| Column                      | Type          | Notes                                                              |
| --------------------------- | ------------- | ------------------------------------------------------------------ |
| `id`                        | `uuid` PK     | Internal identifier, never exposed as the share credential.        |
| `public_id_hash`            | `text` unique | Hash of the high-entropy identifier contained in the private link. |
| `creator_key_hash`          | `text`        | Hash of a separate recovery key used for destructive bill actions. |
| `name`                      | `text`        | Required.                                                          |
| `currency`                  | `char(3)`     | USD or KHR; immutable after the first expense in the MVP.          |
| `archived_at`, `expires_at` | `timestamptz` | Nullable lifecycle timestamps.                                     |
| `created_at`, `updated_at`  | `timestamptz` | Audit timestamps.                                                  |

The raw share and creator keys are returned only at creation, placed in the link/session as appropriate, and never stored in plaintext. Share identifiers require at least 128 bits of cryptographically secure randomness.

### `bill_participants`

| Column                     | Type          | Notes                                                        |
| -------------------------- | ------------- | ------------------------------------------------------------ |
| `id`                       | `uuid` PK     | Stable identity referenced by financial records.             |
| `bill_id`                  | `uuid` FK     | References `bills.id`.                                       |
| `display_name`             | `text`        | Required; unique case-insensitively within an active bill.   |
| `session_token_hash`       | `text`        | Nullable hash used to remember a claimed participant device. |
| `is_creator`               | `boolean`     | Identifies the participant created with the bill.            |
| `deactivated_at`           | `timestamptz` | Nullable; preserves historical references.                   |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps.                                            |

Participants referenced by expenses or settlements are deactivated rather than deleted. In the MVP, one participant can be claimed by only one active device session; a visitor can instead create another participant with a distinct name.

### `bill_payment_methods`

The MVP supports one owner-managed ABA QR per bill. Keeping payment details separate from the bill leaves room for other external payment methods later without changing the financial ledger.

| Column                     | Type          | Notes                                                                               |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `id`                       | `uuid` PK     |                                                                                     |
| `bill_id`                  | `uuid` FK     | References `bills.id`; unique for active `aba_qr` methods.                          |
| `owner_participant_id`     | `uuid` FK     | Must be the bill's active creator participant.                                      |
| `method_type`              | enum          | `aba_qr` in the MVP.                                                                |
| `qr_storage_key`           | `text`        | Private, cropped QR image object key; never a public URL.                           |
| `recipient_label`          | `text`        | Name the owner expects the banking app to display.                                  |
| `supported_currencies`     | `text[]`      | Validated subset of `KHR` and `USD`.                                                |
| `qr_payload_hash`          | `text`        | Hash used to detect duplicate uploads without storing decoded account data in logs. |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps.                                                                   |

Adding, replacing, or removing this method requires the creator recovery key. The upload flow decodes the QR when supported, rejects images without a readable QR, and asks the owner to confirm the displayed recipient and supported currencies. The owner should upload an amount-free ABA QR so the same code works for different settlement amounts; a fixed-amount QR must be clearly identified and is not shown for a different amount.

### `expenses`

| Column                                                   | Type          | Notes                                                              |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| `id`                                                     | `uuid` PK     |                                                                    |
| `bill_id`                                                | `uuid` FK     | References `bills.id`.                                             |
| `description`                                            | `text`        | Required.                                                          |
| `amount_minor`                                           | `bigint`      | Positive integer.                                                  |
| `paid_by_participant_id`                                 | `uuid` FK     | References a participant in the same bill.                         |
| `split_method`                                           | enum          | `equal` or `exact`.                                                |
| `category`                                               | `text`        | Controlled application category.                                   |
| `expense_date`                                           | `date`        | User-selected date.                                                |
| `notes`                                                  | `text`        | Nullable.                                                          |
| `receipt_scan_id`                                        | `uuid` FK     | Nullable; references the confirmed scan that produced the expense. |
| `created_by_participant_id`, `updated_by_participant_id` | `uuid` FK     | Participant attribution.                                           |
| `deleted_at`, `created_at`, `updated_at`                 | `timestamptz` | Soft deletion and audit timestamps.                                |

Indexes: `(bill_id, expense_date DESC)` and `(paid_by_participant_id)`.

### `receipt_scans`

A scan is a temporary, editable draft until it is confirmed. OCR requests run asynchronously so slow extraction does not block a web request.

| Column                                                                      | Type          | Notes                                                                               |
| --------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `id`                                                                        | `uuid` PK     |                                                                                     |
| `bill_id`                                                                   | `uuid` FK     | References `bills.id`.                                                              |
| `uploaded_by_participant_id`                                                | `uuid` FK     | Joined participant who submitted the image.                                         |
| `status`                                                                    | enum          | `uploaded`, `processing`, `needs_review`, `failed`, `confirmed`, or `expired`.      |
| `storage_key`                                                               | `text`        | Private object key; never a public URL.                                             |
| `merchant_name`                                                             | `text`        | Nullable extracted and user-editable value.                                         |
| `receipt_date`                                                              | `date`        | Nullable extracted and user-editable value.                                         |
| `currency`                                                                  | `char(3)`     | Must match the bill currency before confirmation.                                   |
| `subtotal_minor`, `tax_minor`, `tip_minor`, `discount_minor`, `total_minor` | `bigint`      | Nullable draft totals in integer minor units.                                       |
| `adjustment_method`                                                         | enum          | `proportional`, `equal`, or `custom`; controls receipt-level charges and discounts. |
| `provider`, `provider_request_id`                                           | `text`        | Nullable operational metadata; excludes raw credentials and image URLs.             |
| `error_code`                                                                | `text`        | Nullable safe error category for retry and support.                                 |
| `expires_at`, `confirmed_at`, `created_at`, `updated_at`                    | `timestamptz` | Draft lifecycle and audit timestamps.                                               |

Only one expense may reference a confirmed scan, enforced by a unique constraint on `expenses.receipt_scan_id`. Confirmation accepts an idempotency key so browser or network retries return the existing expense instead of creating a duplicate. Unconfirmed scans and their images expire automatically after 24 hours. The product should define a separate, visible retention setting for images attached to confirmed expenses.

### `receipt_items`

| Column                            | Type          | Notes                                                         |
| --------------------------------- | ------------- | ------------------------------------------------------------- |
| `id`                              | `uuid` PK     |                                                               |
| `receipt_scan_id`                 | `uuid` FK     | References `receipt_scans.id`.                                |
| `position`                        | `integer`     | Preserves printed and user-edited order.                      |
| `description`                     | `text`        | Required before confirmation.                                 |
| `quantity`                        | `numeric`     | Defaults to 1 and supports fractional quantities.             |
| `unit_price_minor`, `total_minor` | `bigint`      | The confirmed line total is authoritative for splitting.      |
| `confidence_basis_points`         | `integer`     | Nullable extraction confidence from 0 to 10,000.              |
| `needs_review`                    | `boolean`     | True when extraction is uncertain or internally inconsistent. |
| `created_at`, `updated_at`        | `timestamptz` | Audit timestamps.                                             |

### `receipt_item_assignments`

Assignments say who consumed each item; they are inputs to the final expense shares, not a second financial ledger.

| Column                     | Type          | Notes                                                          |
| -------------------------- | ------------- | -------------------------------------------------------------- |
| `id`                       | `uuid` PK     |                                                                |
| `receipt_item_id`          | `uuid` FK     | References `receipt_items.id`.                                 |
| `participant_id`           | `uuid` FK     | Participant in the same bill.                                  |
| `weight`                   | `integer`     | Positive relative share; defaults to 1 for equal sharing.      |
| `amount_minor`             | `bigint`      | Final allocated line-item amount after deterministic rounding. |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps.                                              |

Constraints: unique `(receipt_item_id, participant_id)`, at least one assignment per confirmed item, and assignment amounts for each item must sum exactly to that item's `total_minor`.

### `expense_shares`

The final amount owed by each included participant is stored regardless of split method, keeping balance queries consistent.

| Column                     | Type          | Notes                              |
| -------------------------- | ------------- | ---------------------------------- |
| `id`                       | `uuid` PK     |                                    |
| `expense_id`               | `uuid` FK     | References `expenses.id`.          |
| `participant_id`           | `uuid` FK     | References `bill_participants.id`. |
| `amount_minor`             | `bigint`      | Non-negative integer.              |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps.                  |

Constraints:

- Unique `(expense_id, participant_id)`.
- Shares must sum to the expense amount, enforced by the transactional write operation.
- Rounding remainders are assigned deterministically so totals always match.

### `settlements`

| Column                                     | Type          | Notes                                 |
| ------------------------------------------ | ------------- | ------------------------------------- |
| `id`                                       | `uuid` PK     |                                       |
| `bill_id`                                  | `uuid` FK     | References `bills.id`.                |
| `from_participant_id`, `to_participant_id` | `uuid` FK     | Sender and receiver in the same bill. |
| `amount_minor`                             | `bigint`      | Positive integer.                     |
| `settled_at`                               | `timestamptz` | Effective payment time.               |
| `notes`                                    | `text`        | Nullable.                             |
| `created_by_participant_id`                | `uuid` FK     | Participant attribution.              |
| `deleted_at`, `created_at`, `updated_at`   | `timestamptz` | Soft deletion and audit timestamps.   |

The sender and receiver must differ. Index `(bill_id, settled_at DESC)`.

### `activity_log`

| Column                     | Type           | Notes                                         |
| -------------------------- | -------------- | --------------------------------------------- |
| `id`                       | `uuid` PK      |                                               |
| `bill_id`                  | `uuid` FK      | References `bills.id`.                        |
| `actor_participant_id`     | `uuid` FK      | Nullable for system events.                   |
| `entity_type`, `entity_id` | `text`, `uuid` | Identifies the affected record.               |
| `action`                   | `text`         | For example `expense.created`.                |
| `metadata`                 | `jsonb`        | Small display snapshot, not a balance source. |
| `created_at`               | `timestamptz`  | Immutable event time.                         |

Index `(bill_id, created_at DESC)`.

## Balance calculation

For each active expense:

```text
participant net = amounts paid - assigned expense shares
```

Then apply settlements:

```text
sender net += settlement amount
receiver net -= settlement amount
```

A positive result means the participant should receive money; a negative result means they owe money. All participant nets must sum to zero. A deterministic debtor/creditor matching algorithm can suggest transfers without changing the ledger.

### Receipt share calculation

For a confirmed receipt, calculate each participant's expense share in one server-side transaction:

1. Allocate every line item among its assigned participants by weight, assigning minor-unit remainders deterministically.
2. Allocate tax and tip using the selected method; proportional allocation uses each participant's pre-tax item total.
3. Allocate discounts as negative adjustments without allowing any participant's final share to become negative.
4. Allocate any remaining rounding difference deterministically.
5. Reject confirmation unless participant shares sum exactly to the receipt total and the total is positive.

The transaction creates the expense and its `expense_shares`, marks the scan confirmed, and writes one activity entry. Later balance calculations use only `expense_shares`, so rescanning or draft edits cannot affect balances.

## Access and safety model

Removing accounts intentionally trades strong identity verification for low friction. The MVP should make that trade-off explicit and safe enough for casual, non-sensitive bills:

- Generate share and creator keys with a cryptographically secure random generator.
- Store only key hashes in PostgreSQL and avoid placing raw keys in logs or analytics.
- Resolve bill links and perform all bill reads/writes through server routes; do not expose unrestricted tables to the browser.
- Use secure, signed, HTTP-only, `SameSite=Lax` cookies for participant sessions.
- Verify on every write that the participant, expense, shares, and settlement all belong to the resolved bill.
- Validate receipt content by decoded file signature, size, pixel dimensions, and page count rather than trusting the filename or browser MIME type.
- Strip image metadata where practical, store images in a private bucket, use short-lived signed URLs, and prevent OCR providers from retaining or training on receipt data where configurable.
- Crop payment QR uploads to the QR region where possible, strip surrounding screenshot metadata, and never log the decoded QR payload, account number, or signed image URL.
- Show the expected recipient label, settlement amount, and currency beside the QR and tell payers to verify all three in their banking app before confirming.
- Restrict ABA QR changes to possession of the creator recovery key and record changes in the activity log without including the QR payload.
- Treat all extracted text as untrusted input, escape it in the UI, and never let receipt text become a prompt or command without strict structured-output validation.
- Rate-limit uploads and OCR retries per bill and participant, and enforce automatic cleanup for abandoned scans.
- Rate-limit bill creation, link resolution, joining, and mutations.
- Do not use a person's display name as proof of identity.
- Allow anyone with the private link to view the bill; require a participant session to make changes.
- Reserve permanent deletion, link rotation, and bill archival for the creator recovery key.
- Define a retention window for abandoned bills and provide a clear permanent-delete action.

## Suggested application structure

```text
src/
  app/                 # Next.js pages, layouts, and server route handlers
  components/          # Shared UI and domain components
  features/            # Bill, participant, receipt, expense, balance, and settlement modules
  lib/                 # Supabase client, cookies, tokens, money, OCR/QR adapters, and utilities
  schemas/             # Shared Zod runtime validation schemas
  server/              # Server-only queries, commands, access checks, and calculations
supabase/
  migrations/          # Versioned schema migrations
  seed.sql              # Local demonstration data
tests/
  e2e/                  # Playwright user journeys
```

## Development roadmap

### Phase 0 — Foundation

- Confirm terminology, wireframes, access warnings, expiration policy, and acceptance criteria.
- Initialize Next.js with JavaScript, formatting, strict ESLint rules, and environment validation.
- Configure local Supabase, preview/production projects, CI, and deployment previews.
- Build design tokens, the responsive shell, error boundaries, and shared form controls.

**Exit criteria:** the app builds in CI, preview deployments work, and local setup is documented.

### Phase 1 — Create, access, and join a bill

- Create schema migrations for bills, participants, and activity.
- Implement cryptographic share keys, creator recovery keys, and signed participant cookies.
- Build the landing form and atomic bill-plus-creator creation flow.
- Build bill resolution, participant joining, returning-device behavior, and link sharing.
- Add integration tests for valid, invalid, expired, rotated, and cross-bill credentials.

**Exit criteria:** a new visitor can create and share a bill in under a minute, and another device can join without an account.

#### Current Phase 1 progress

- The landing form creates a bill and its creator atomically, stores the creator
  recovery capability on that device, and opens the private bill URL.
- Private bill links resolve server-side, show current participants, and can be
  copied for sharing. New devices can join without an account.
- Joined participants can add another person without claiming that identity.
  A new device can claim an available listed person or add a distinct name.
- Signed, path-scoped, HTTP-only participant cookies remember each bill on a
  device and are checked against hashed server-side session capabilities.
- Share, recovery, and session capabilities contain 256 bits of randomness;
  only SHA-256 digests cross the database boundary.
- The migration creates bills, participants, activity entries, atomic create and
  join functions, constraints, indexes, RLS, and restricted browser roles.
- Unit and live-database tests cover capabilities, cookie tampering, expiry,
  signing-key rotation, cross-bill rejection, atomic participant claiming,
  input validation, and UI foundations. Browser tests cover the complete
  create, add, share, claim, return, and join journey.

### Phase 2 — Expense ledger

- Build expense create, edit, and remove flows directly from the bill page.
- Implement equal and exact splits with integer arithmetic.
- Add transactional expense/share writes and audit events.
- Build expense history, filters, and clear empty/error states.
- Build the receipt upload flow, private image storage, and asynchronous extraction adapter.
- Build the receipt review screen with low-confidence and total-mismatch states.
- Implement editable receipt items, item-to-participant assignment, adjustment allocation, and atomic confirmation.
- Add fixture-based extraction tests and browser tests for successful, partial, failed, and retried scans.

**Exit criteria:** manual and uploaded-receipt expenses preserve totals under rounding, no OCR draft affects balances before confirmation, and every change is attributable and auditable.

#### Current Phase 2 progress

- The bill page supports manual expense creation, editing, removal, equal/exact
  integer splits, history filters, and attributable activity entries.
- Receipt images use an upload-only JPEG/PNG/HEIC picker and a private Supabase
  Storage bucket. Extraction runs after the upload response and supports retry.
- Receipt review supports editable totals and items, low-confidence and mismatch
  warnings, item assignments, proportional/equal/custom adjustments, and atomic,
  idempotent confirmation. Unconfirmed drafts never create expense shares.
- Totals fields wrap to fit the review panel. Reconciliation includes tax, tip,
  and discount, updates on edits, and distinguishes valid adjustments from
  missing items, incorrect subtotals, and invalid amounts.
- An editable unit-price field sits between description and line total. It
  recalculates that line using the scanned quantity, shown below the price.
  Confirmation preserves corrected quantities and prices atomically; apply
  `20261013000000_preserve_receipt_unit_prices.sql` on other database projects.
- The production adapter sends an oriented, resized, metadata-free image inline
  to Gemini using server-only `GEMINI_API_KEY`. It requests structured JSON and
  validates amounts, dates, field lengths, and item counts locally with Zod.
- Extraction instructions cover quantities, duplicate items, readable Khmer
  descriptions, USD/KHR totals, and discounts. Hidden descriptions stay unknown;
  model confidence is not treated as a calibrated probability, so every Gemini
  item is flagged for review. Only confirmation writes expense shares.
- Previous OCR.Space text-parser fixtures, including a manually transcribed
  Cambodian photo, remain as reference tests. Gemini does not use that parser.
  Real receipt accuracy still needs evaluation through the live review flow.
- If no Gemini key is configured, uploads enter a clear failed state and can
  be retried or entered manually without affecting the ledger.
- Local manual testing can set `RECEIPT_EXTRACTION_DEV_FIXTURE` to `success`,
  `partial`, or `failed`; this fixture adapter is disabled in production.

### Phase 3 — Balances and settle-up

- Implement derived balance queries and zero-sum invariant tests.
- Add balance explanations and the simplified transfer algorithm.
- Build creator-only ABA QR upload, replacement, validation, and removal.
- Show the QR only for owner-directed settlements, with amount, currency, recipient verification, and manual confirmation messaging.
- Build settlement recording, correction, and removal flows.
- Add a browser test for create bill → join → add expense → settle.

**Exit criteria:** users can understand and completely settle a bill without creating accounts.

**Implementation status (2026-10-17):** Phase 3 code is implemented. Apply
`supabase/migrations/20261017000000_phase_3_settlements.sql` to the hosted
Supabase project before using it. Paste the complete file into the SQL editor
and run it once; it includes a transaction. The app shows a setup message until
the migration is applied. Existing expenses and receipt drafts are preserved.
Hosted application has not been confirmed. The user manages hosted migrations;
do not rerun this migration if it has already succeeded on that project.

After migration, the bill page shows **Balances & payments** below **People**.
Each person has an **Owes**, **Is owed**, or **Settled** status and an expandable
explanation. Suggested transfers appear for nonzero balances. Joined members
can record payments and use **Payment history** to correct or remove records.
The creator sees **Owner ABA QR settings**; **Pay with ABA QR** appears only for
an eligible owner-directed transfer after the owner saves a matching QR.

- Balances come from a single database snapshot of confirmed expenses, their
  shares, and active settlement records. Expense history filters never change
  the balance. Inactive participants retain their historical balances.
- Each participant can expand their balance to see paid amounts, assigned
  shares, payments, and contributing expenses. Deterministic transfers settle
  the net amounts; this greedy algorithm does not guarantee the global minimum
  possible number of transfers.
- Joined participants can record full or partial payments, correct records,
  and remove mistaken records with confirmation. A payment must be explicitly
  confirmed as already made outside the app. Creation is idempotent for the
  same submission; corrections and removals reject stale versions. Changes and
  previous payment details are recorded atomically in the activity log.
- Owner QR settings require both the original creator participant session and
  the creator recovery cookie on that device. Cross-device owner recovery is
  not implemented yet. Other members can view eligible QR payments using the
  private bill link, but cannot change the QR.
- QR uploads accept a single JPEG/PNG image up to 10 MB. The server checks
  KHQR field structure and CRC, requires USD/KHR matching the bill, rejects
  unreadable/multiple symbols and automatic fee fields, and crops the image.
  The owner confirms the decoded recipient/currency in a preview valid for ten
  minutes. Validation follows the [NBC KHQR SDK documentation](https://bakong.nbc.gov.kh/download/KHQR/integration/KHQR%20SDK%20Document.pdf);
  image decoding uses [jsQR](https://github.com/cozmo/jsQR). Legacy ABA URL QRs
  are not supported. This does not verify bank account ownership.
- Images live in the private `payment-qrs` bucket. Replacing/removing a QR
  removes its old object after the database write succeeds. View/download URLs
  expire within 60 seconds, or sooner if the QR expires. Fixed-amount QRs only
  appear for matching owner-directed transfers; expired QRs are not offered.
  QR viewing never writes a payment record.
- `npm run test` includes offline PostgreSQL tests using PGlite, which apply
  every migration and exercise transactions, permissions, and zero-sum
  balances. They do not contact the hosted database or Gemini.
- After applying the hosted migration, `npm run test:e2e:phase3` exercises
  create → join → expense → synthetic owner QR → settle → correct → remove.
  It uses synthetic data, never sends a bank payment, and cleans up its test
  bill and QR image. The hosted browser flow remains to be run after migration.

### Phase 4 — Hardening and launch

- Complete accessibility, responsive, and cross-browser reviews.
- Add rate limiting, redacted structured logging, analytics consent, and Sentry.
- Test backup/restore, migrations, key rotation, expiration, and permanent deletion.
- Add privacy information, support guidance, monitoring, and a launch checklist.

**Exit criteria:** critical journeys pass automated and manual checks and the MVP is ready for invited users.

### Phase 5 — Learn and iterate

- Measure bill creation, first-expense completion, sharing, joining, and settle-up completion.
- Interview early users about link access, participant identity, and recovery pain points.
- Add optional accounts only if cross-device access and recovery are validated needs.

## Quality gates

Every pull request should pass:

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e # for affected critical journeys
```

Money utilities need table-driven tests for indivisible equal splits, exact totals, receipt item weights, proportional tax/tip, discounts, large values, edits, removals, and settlements. Receipt tests must cover rotated images, duplicate line descriptions, quantities, negative discounts, low-confidence fields, total mismatches, unsupported/corrupt files, timeouts, retries, duplicate confirmation, and draft/image expiry. Payment QR tests must cover unreadable and duplicate QRs, fixed amounts, KHR/USD currency handling, non-owner changes, image replacement/removal, signed URL expiry, recipient display, and the rule that QR viewing never creates a settlement. Access tests must cover guessed/invalid links, expired bills, session tampering, cross-bill references, creator-only actions, and rate limits.

## Decisions to confirm before implementation

1. Should anyone with the link be able to view the entire bill? **Proposed: yes.**
2. Should changes require joining as a participant first? **Proposed: yes.**
3. Can one participant identity be claimed on only one device in the MVP? **Proposed: yes; add a separate participant on another device.**
4. Who may edit expenses? **Proposed: any joined participant, with every change recorded in activity.**
5. Should unused bills expire automatically? **Proposed: expire after 12 months without activity, with a warning before deletion.**
6. Should optional accounts be postponed until users request cross-device sync or recovery? **Proposed: yes.**
7. How should tax, tip, and discounts be shared? **Proposed: proportional to each person's assigned item subtotal by default, with equal and custom alternatives.**
8. How long should confirmed receipt images be retained? **Proposed: delete the image after extraction and confirmation by default, while retaining the corrected structured items.**

Confirming these access and retention decisions is the final planning gate before application scaffolding begins.
