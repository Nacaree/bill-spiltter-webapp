# Bill Splitter

Bill Splitter is a responsive web app for creating a shared bill, adding people and expenses, calculating fair shares, and settling up—without requiring anyone to create an account.

## Local development

### Prerequisites

- Node.js 22.12 or newer and npm
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

The normal checks do not use hosted Supabase or Gemini. Opt-in browser and
integration checks create synthetic test bills in the configured project.

## Local design reference

With `npm run dev` running, open [the design studio](http://localhost:3000/design-system).
The reference route is development-only and returns not-found in production.

The approved system is applied across the app and shared with this reference:

- **#663399** brand and **Helvetica** throughout, with **Bold (700)** headings.
- **Round** corners: 22px controls, 32px cards; circular checks inside split pills.
- **Relaxed** spacing: 48px controls, 28px panel padding and 18px ledger rows.
- Selective glass at frost 45 for navigation, balance summaries and picker menus;
  forms, ledger entries, receipt review and QR details retain solid surfaces.
- One inner focus stroke on fields, accessible keyboard menus, visible validation
  messages and preserved entries after rejected submissions.
- **Animate UI** is the production animated icon library. Lucide Animated remains
  in the side-by-side reference comparison. Original sources and licenses remain
  under `src/components/design-system/icons/`.

The **Approved foundations** panel is read-only. **Copy theme** exports the locked
settings. Interactive reference examples use sample data and never scan receipts
or change bills. The [person-picker gallery](http://localhost:3000/design-system#person-picker)
retains closed, open and selected states plus a working keyboard-accessible picker.
Shared controls live in `src/components/ui/` and `src/components/design-system/`;
canonical CSS tokens are in `src/components/design-system/tokens.css`.
Dropdown menus can grow wider than their trigger (240px minimum when space
allows), stay within the viewport, and keep labels on one line with a reserved
checkmark column. Unusually long labels use an ellipsis with full-text titles.
Helvetica uses the system installation with Helvetica Neue/Arial fallbacks.
No custom heading font is downloaded.

The [calendar preview](http://localhost:3000/design-system#date-picker) combines
DayPicker with Animate UI: a rounded glass panel, bold Helvetica month headings,
purple selected dates, an outlined today, and Today / Yesterday shortcuts.
Opening takes 240ms, month transitions 300ms, and selection feedback 150ms.
The calendar stays anchored when it fits, and centers on narrow/short screens or
when neither side of the field has enough room. Reduced motion makes changes
immediate. This is a local design preview; live expense, receipt and payment date
fields still use the native picker pending visual review.

The [motion playground](http://localhost:3000/design-system#motion-playground)
shows short press, selection, reveal, success and dialog transitions. A soft white
shimmer makes one 1.8-second pass on interaction. Reduced motion keeps controls
functional and uses a still highlight. The icon comparison remains replayable.

The four-piece purple mark in `src/app/icon.svg` is the canonical logo and browser
icon. Header, favicon ICO (16/32/48px) and Apple touch icon use that artwork.
Regenerate raster icons with `npm run icons:generate` after changing the vector.
Next.js supplies icon metadata through its file conventions.

**Upload receipt** opens the picker and starts validation/upload/scanning when an
image is selected. Cancellation does nothing. Failed uploads offer explicit retry
with the retained file/reservation and a way to choose another image. Review and
confirmation remain separate. Owner QR inspection and saving remain explicit.
Expense-history category and person filters apply immediately, without a Filter
button.

Run `npm run test:e2e:design` for offline Chromium, WebKit and iPhone-emulation
checks. The suite uses real form components with mocked action/upload boundaries
and excludes hosted-write journeys. If a dev server is already running, use
`PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:design`.
These checks do not replace real-device or screen-reader signoff.

## Mobile and accessibility checks

Install the browser engines once after `npm ci`:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e:a11y
```

The default accessibility suite checks the home and invalid-link pages without
writing hosted data. It runs axe WCAG A/AA checks, keyboard/skip-link navigation,
and reflow at 320, 375, 768 and 1280 CSS pixels. The matrix includes Chromium,
Firefox, desktop WebKit, Android emulation and iPhone WebKit emulation.

After the existing migrations and `.env.local` are configured, run:

```bash
npm run test:e2e:a11y:live
```

This explicitly creates synthetic bills/people and exercises expense validation,
editing, payment controls and receipt review against the local Next.js server.
It seeds ready receipt drafts directly, makes no Gemini calls and spends no scan
quota. Its bill rows and drafts are removed in `finally`; no storage images or
bank transfers are created. UI writes still use the normal action limits.
Narrow bill/receipt screenshots are saved under ignored `test-results/`.
Use `-- --project=iphone` (or another project name) to run one configuration.

The UI keeps rejected form entries, links validation messages to controls/groups,
and focuses the first invalid field or action error. Receipt rows keep focus
when added/removed; saved expense editors return focus to Edit. Shared fields
have separate labels and descriptions. Native controls reflow (including long native options in WebKit), touch inputs use
16px text, disclosure and receipt actions have larger targets, keyboard focus is
visible, and reduced-motion preferences disable animations. Copying the private
link announces success and offers a selected text field if clipboard access fails.
No migration is required for these changes.

Mobile/accessibility fixes and earlier automated axe, keyboard/focus and reflow
checks are complete; Stage 3 recorded 10 lifecycle browser passes across
Chromium/WebKit desktop and Android/iPhone emulation. Firefox is configured but
remains unverified because it could not launch locally. Stage 6 also completed
the deployed functional checks below. The following manual evidence is still
unverified in the handoff; record any existing user results before repeating it:

- On a real iPhone/Safari and Android/Chrome, check portrait/landscape, file
  pickers, the on-screen keyboard, focus visibility, zoom and large text.
- With VoiceOver or TalkBack, create/join a bill, correct an invalid expense,
  assign receipt items and review/record a payment. Check field names, group
  names, error announcements and focus after actions.
- On a desktop keyboard, complete those flows using Tab/Shift+Tab, Enter and
  Space, including disclosures, exact splits, corrections and removals.

## Vercel live testing

The first live test uses the existing hosted Supabase project. Vercel runs the
Next.js frontend/server code; Supabase provides the database and private storage.
No separate backend server or Docker is needed. Use fresh test bills.

### Apply the migrations manually

Apply any missing migrations in filename order through Supabase SQL Editor.
Do not rerun migrations already applied to that hosted project. Recent required
files are:

1. `20261017000000_phase_3_settlements.sql`
2. `20261019000000_dual_currency_payment_qrs.sql`
3. `20261020000000_direct_image_uploads.sql`
4. `20261021000000_rate_limiting.sql`
5. `20261022000000_bill_lifecycle.sql` — follow the lifecycle rollout below.

Run each complete file, including its transaction. The direct-upload migration adds
private upload reservations/staging storage and guarded extraction RPCs. It
preserves existing expenses, receipt scans, and owner payment images. Apply it
when no extraction is running, then restart/deploy the updated code: the old
unguarded extraction RPCs are retired, so older receipt workers are incompatible.
The user reports the required migrations were applied and the deployed live
flow works. Automated hosted verification by the agent has not been run.

### Bill lifecycle and permanent deletion — Stage 3

Implemented and committed on `main`. The user reported applying
`20261022000000_bill_lifecycle.sql` and passing the Stage 3 live smoke checks on
2026-10-23. Exact hosted deployment identity has not been independently captured.
Stage 2 backup/recovery was skipped at the user's request.

- A bill expires after 12 calendar months in UTC without a qualifying change.
  Successful participant changes, expense/payment/QR changes, completed receipt
  uploads and receipt confirmation renew the deadline. Reads, rejected requests,
  retries and extraction processing do not. The page shows the expiry date and
  warns during its final 30 days; there are no email notifications.
- Expiry immediately blocks reads, writes, upload completion, receipt workers,
  confirmation and new image links. Physical deletion is eligible immediately,
  with no grace/undo period; it happens when the private cleanup command runs.
- Unconfirmed receipt drafts become inaccessible at 24 hours. Confirmed receipt
  images remain until bill deletion and can be opened from the associated
  expense's View receipt link. Older images already removed by previous code
  display “Receipt image unavailable”; their financial records remain intact.
- Creator deletion requires the existing creator device's valid participant and
  recovery cookies plus typing `DELETE`. Authorization is repeated inside SQL.
  There is no cross-device recovery or new archive flow. Existing credential
  lifetimes are unchanged; the creator must still have valid credentials.
- One transaction queues Storage removal and deletes the bill, participants,
  expenses/shares, receipt items/assignments/scans, payment records/methods,
  upload reservations, activity and bill/participant quota rows. Shared IP/global
  quotas remain. Other bills are untouched; duplicate requests cannot resurrect
  deleted records. Only this bill's cookies are cleared.
- Private file jobs have no parent FK, so deletion cannot erase retry work.
  An initial sweep removes files in this bill's exact folder in all three
  buckets; orphan and nested files are included. Jobs remain for a final sweep
  at least 24 hours later, catching late uploads with two-hour signed tokens.
  Partial removal resumes at offset zero; timeouts, storage failures and stale
  leases preserve work. Storage bytes are deleted through the Storage API,
  never by deleting `storage.objects` SQL rows.
- Receipt links last at most five minutes and QR links at most 60 seconds, capped
  by the remaining bill/draft/QR lifetime. Previously issued links can remain
  usable until their deadline if file removal is still pending. No new app
  access is granted after expiry/deletion.

#### Private lifecycle command

After the migration is applied, inspect counts without changing records:

```bash
npm run lifecycle:cleanup
# Equivalent: npm run lifecycle:cleanup -- --dry-run
```

Apply mode requires the explicit ref to match the configured URL:

```bash
npm run lifecycle:cleanup -- --apply --project-ref <matching-project-ref>
```

The command uses the URL/service-role key from `.env.local`; it logs only the
public project ref, mode and aggregate counts. Each apply run removes at most
20 expired bills plus 20 expired drafts, then handles at most three due file
jobs. Each file job lists at most ten pages and removes at most 100 objects;
nested traversal is capped at eight levels. Unexpected paths remain failed
rather than escaping the bill folder. Leases expire after five minutes;
failed jobs retry after five minutes, partial jobs are due immediately, and a
drained initial job waits until its 24-hour final-sweep time. Future jobs remain
in `pendingFileJobs`, so a nonzero queue count does not necessarily mean failure.
Repeat bounded runs for due work and return after final-sweep times. Scheduling,
monitoring cadence and hosted cleanup rehearsal are Stage 4 work. One approved
Production apply batch and subsequent due-file batches completed on 2026-10-23;
final sweeps remain, as recorded in HANDOFF. Expiry enforcement does not need the worker.

#### Stage 4 automated daily cleanup

**Enabled in Production on 2026-10-23.** Worker revision `b0ba0ac` was deployed
Ready with `LIFECYCLE_CLEANUP_ENABLED=true`, the matching project ref, and a
Production-only `CRON_SECRET` entered by the user. Disabled-first 401/405/503 checks
passed before activation. One approved enabled dashboard probe completed at
03:02 GMT+7 with no failures or removals, leaving all 13 future final sweeps queued.
Oct 24 read-only follow-up verified the original 13 queue entries gone, their
cleanup targets absent and baseline totals unchanged (19 bills, 8 confirmed
receipts, 10 expenses). Nine future file jobs remain: six Stage 6 jobs due by
Oct 25 00:48 GMT+7 and three later jobs due Oct 25 15:42 GMT+7. No jobs were
manually processed during that follow-up. Cron remains enabled, but the first
scheduled invocation/result could not be retrieved within Vercel's available log
range. Capture a future scheduled run while logs remain available. Existing
confirmed images at that audit all predated retention and were absent. At 18:37
GMT+7, a new labelled synthetic bill with one $12 confirmed receipt was left
active for preservation testing. Its image reopened successfully; byte/hash
baseline and fixture IDs are in HANDOFF. Keep it through scheduled cleanup and
verify it afterward before removing that fixture. The new aggregates including
it are 20 bills, 9 confirmed receipts and 11 expenses; pending file jobs remain
nine. Preparing it used one additional Gemini request, no retry. HANDOFF records
the evidence and limits. No new SQL migration is needed. Documentation-only
commits may deploy identical worker code.

**Oct 25 follow-up, 18:55 GMT+7:** all six Stage 6 jobs are gone and their exact
prefixes empty. The retained confirmed image matches its original 59,685-byte
SHA-256 baseline and reopened visibly in a fresh private browser session; its
same single $12 expense and aggregate totals are unchanged. Three later jobs
became due at 15:42, after today's morning schedule, and await Oct 26's run.
No manual cleanup ran. Exact scheduled-run time/result is still not captured;
verified queue/image outcomes do not establish the invocation source. Keep the
retained test bill for the remaining follow-up. See HANDOFF for evidence/limits.

`vercel.json` schedules `GET /api/cron/lifecycle-cleanup` at `0 20 * * *` UTC:
**3–4 a.m. Phnom Penh time daily**. Hobby execution can happen anywhere in the
selected hour. Delivery is best effort, so this is not an exact removal-time
promise. The database continues enforcing expiry even when cleanup is delayed.
See [Vercel scheduling limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

The route requires a constant-time checked `Authorization: Bearer <CRON_SECRET>`
header, `VERCEL_ENV=production`, the explicit enable flag, matching HTTPS Supabase
project coordinates and the existing service-role key. It rejects query
parameters, returns uncached responses and explicitly rejects HEAD/other methods.
All gates run before creating the database client. Missing/invalid secret returns
503; wrong/missing authorization returns 401 once the secret is configured;
Preview/development returns 404; disabled or mismatched configuration returns 503.

Each invocation runs one database lifecycle batch (at most 20 expired bills and
20 expired unconfirmed receipts), one stale-upload batch (at most 20 reservations
older than 24 hours), one counter batch (at most 100 windows expired over 24 hours
ago), then at most 40 sequential file batches of three jobs. Confirmed receipt
images stay until bill deletion. Global/IP counters remain until their normal
old-window cleanup deadline. Existing row locks, job leases and idempotent file
removal support overlapping/duplicate invocations without a new database schema.

The Node function allows 300 seconds, stops starting batches at 210 seconds,
aborts cleanup requests at 240 seconds, and caps individual requests at 15
seconds. Leases survive interrupted acknowledgement. No final sweep is claimed
before its database deadline. Remaining due work is counted separately from all
pending jobs, so future/leased jobs alone do not produce a partial/failure status.

One structured `scheduled_cleanup` log and the authenticated JSON response contain
only aggregate counts, duration, remaining due work and stopping reason.
`status=completed` or `partial` returns HTTP 200; operation/deadline failures return
500 and use the existing Sentry `lifecycle_cleanup` error helper. Unknown progress
after a lost response is marked `countsComplete=false`; a timeout does not imply
transaction rollback. No provider errors, credentials, object paths, bill contents
or image URLs are emitted. A Storage failure stops further removals; claimed but
unprocessed jobs retain five-minute leases and remain retryable.

Failed/unfinished work is revisited by the next daily invocation, not an immediate
Vercel retry. No new email or missed-run monitor is configured. Inspect
**Vercel → Settings → Cron Jobs / Logs**, and Sentry's `lifecycle_cleanup` errors.
An authorized operator can invoke the same route manually with the private bearer
header for earlier recovery; never put the secret in a URL, command log or chat.
See [Vercel cron operation](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

**Activation order:**

1. Keep the current branch and existing changes; review the tested implementation.
   The three cron variables are optional at build time, validated at the route.
2. The user generates a new secret from at least 32 random bytes and saves it as
   `CRON_SECRET` in Vercel, type **Secret**, **Production only**. The computer-use
   credential-entry rules require the user to enter and save it themselves.
   Do not copy the value into documentation or chat. Retain the two config values
   above, with cleanup still disabled.
3. Publish/deploy the new candidate while disabled. Verify Production is Ready
   for that commit, unauthenticated GET returns 401, HEAD returns 405, and an
   authenticated operator request returns 503 without database access. Cron's
   bearer header must pass any existing deployment protection; do not make old
   deployments public or weaken protection to bypass a failure.
4. Change the Production enable flag to `true` and redeploy. Verify the intended
   release and daily cron registration. The enabled endpoint performs project-wide
   agreed cleanup; it is not restricted to today's 13 jobs.
5. Verify the first scheduled invocation and aggregate result. For the existing
   jobs, all final deadlines have passed after **2026-10-24 02:30 GMT+7**. Confirm
   their final sweeps remove the queue entries and their exact Storage folders/
   objects remain absent. Check an active bill's **View receipt** still opens
   after refreshing. Record evidence in HANDOFF before closing Stage 4.

**Emergency stop:** disable Cron Jobs in Vercel to stop future scheduled calls;
set `LIFECYCLE_CLEANUP_ENABLED=false` and redeploy to disable the current endpoint.
Neither action undoes completed deletion or cancels an already-running request.
Do not roll back to the pre-lifecycle release that deletes confirmed images.
Manual operator commands remain available below; do not run them concurrently
while investigating an unexpected result.

#### Stage 4 manual fallback and completed rehearsal

Initial user decision (2026-10-23): **manual first**, followed by the daily
automation decision above. This fallback routine
uses the existing commands and requires no additional migration or deployment.
It does not install a scheduler. The user approved one Production batch on
2026-10-23: five expired drafts were removed and three file jobs processed without
failure. The user then authorized continuation: seven remaining due file jobs
succeeded in three files-only batches. All 13 jobs now await final sweeps; Storage
metadata checks found the deleted bill folders empty and expired-draft targets
absent. HANDOFF records exact results and authorization scope. The procedure below
is the repeatable operator runbook.

1. From `main`, verify that `.env.local` targets the intended project without
   printing keys. Run `npm run lifecycle:cleanup` first. It only counts expired
   bills, expired unconfirmed drafts and all pending file jobs; it does not list
   which bills are affected or distinguish due jobs from future jobs. Record the
   observation time, public project ref, counts and command exit status.
2. Review the scope before the first destructive run. Apply is project-wide,
   including all eligible existing data, not just the latest test bill. With
   approval, run one bounded batch for the current Production target:

   ```bash
   npm run lifecycle:cleanup -- --apply --project-ref uvznqgkbodejvksmtafh
   ```

   It permanently removes up to 20 expired bills and 20 expired unconfirmed drafts
   and processes up to three due file jobs. Record `bills_removed`,
   `drafts_removed`, `files.processed`, `files.failed`, `files.waiting` and exit
   status. Counts can change between preview and apply. Do not invoke cleanup RPCs
   directly or edit timestamps to force Production fixtures to expire.

3. Run the count-only preview again. Check a retained disposable active bill and
   its confirmed receipt still work. Stop on unexpected removals, command errors
   or storage failures and investigate configuration, schema and Storage access
   before retrying. Never clear jobs manually to hide a failure. A failed job or
   interrupted lease can retry after five minutes; partial jobs may be due
   immediately. Repeat reviewed bounded batches for eligible work as needed.
4. Pending file jobs can legitimately remain until their final sweep, at least
   24 hours after each job was created. Return after that deadline and apply
   again. Do not loop solely because `pendingFileJobs` is nonzero: it includes
   future and leased jobs. Use read-only `lifecycle_file_jobs` timing metadata to
   distinguish due work from waiting work. Verify the known disposable bill's
   exact folders are empty in receipt, QR and staging buckets after its final
   sweep; active bills' files must remain. Store only aggregate evidence.
5. For the initial manual period, the project owner should check once daily and
   after testing deletion. This is an operating cadence, not an automated task or
   a cleanup-time guarantee. Record each run and its next required follow-up in
   HANDOFF. Review growing overdue counts or repeated failed attempts rather than
   ignoring them. A day with no eligible work needs only the count-only check.

Two additional commands **mutate immediately and have no dry-run mode**:

- `npm run uploads:cleanup`: up to 20 upload reservations older than 24 hours,
  their staging files and incomplete receipt copies. Completed receipt images
  are retained. Failures preserve reservations for retry. Check eligibility with
  metadata-only counts first; with approved scope, repeat until zero.
- `npm run rate-limits:cleanup`: up to 100 counter windows expired more than
  24 hours ago. It does not reset live counters or policies. Check eligibility
  with metadata-only counts first; with approved scope, repeat until zero.

QR replacement/removal deletes the previous QR at request time. Failures are
reported as `qr_cleanup`; there is currently no durable retry for these orphans
while their bill remains active. Lifecycle folder sweeps remove them when the
bill is deleted. Do not claim the manual lifecycle routine repairs all live-bill
QR orphans; investigate logged failures separately before targeted removal.

Stage 4 completion requires recorded successful eligible cleanup, preservation
of active/confirmed data, repeat-run results and final-sweep/file evidence.
Offline tests cover controlled failures and late uploads. There is no isolated
hosted backend, so do not inject outages or artificial expiry into Production.
Stage 2 remains skipped. Daily automation is enabled and manually probed;
time-triggered execution and final-sweep verification remain as described above.

#### Coordinated lifecycle rollout — later explicit operator action

The pre-lifecycle release deleted images in an `after()` confirmation callback.
The following runbook records the intended transition; the migration and smoke
checks are now user-reported complete, but individual maintenance steps were not
independently verified. Do not reapply SQL just to repeat this runbook. When
transitioning from old code, use a short maintenance window so that code cannot
delete newly retained images:

1. Prepare the tested candidate. In Vercel Security → Deployment Protection,
   temporarily use Vercel Authentication for **All Deployments**, including
   Production domains. Record existing settings and ensure exceptions/bypass
   access cannot continue sending application traffic. Operators must close old
   app tabs and stop invoking old deployment URLs. Verify the public domains and
   old immutable URLs are gated before proceeding. This scope is available on
   every plan per [Vercel's September 2026 announcement](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan).
2. Wait at least three minutes after the last old request and confirm old workers
   and confirmation callbacks have finished. The receipt routes have a 120-second
   function budget. Keep traffic gated throughout migration and deployment.
3. The user applies the complete lifecycle migration, after the existing rate-limit
   schema. It adds/backfills metadata and replaces guarded RPCs; applying it does
   not purge data. Existing expired/archived bills are not reopened. Do not reapply
   earlier SQL merely because manually applied migrations are absent from history.
4. Deploy/promote the new candidate while gated, verify its commit/build and schema,
   and verify generated/old deployment URLs remain protected. Only the new current
   Production domain should be public when restoring **Standard Protection**.
   Reopen traffic only after these checks. Stage 6 owns real hosted journey tests;
   no customer bill is used as a deletion test.
5. Do not roll back to the old image-deleting release once retention is enabled.
   If rollout fails, keep traffic gated and fix forward or use a compatible build
   that retains images. Cleanup operation remains a separate Stage 4 action.

No deployment protection, credential, migration or deployment setting was changed
while implementing Stage 3. This is a future rollout runbook, not an instruction
to apply the migration while the old release is serving traffic.

#### Offline lifecycle verification

```bash
npm test
npm run test:e2e:lifecycle
npm run lint
npm run format:check
SENTRY_AUTH_TOKEN='' npm run build -- --webpack
```

The lifecycle browser suite uses the real client components with mocked actions,
the generated app stylesheet and the static deletion-result page. It covers
Chromium/WebKit desktop, 320px Chromium, Android and iPhone emulation, axe,
keyboard errors/pending states and reflow; it does not call Supabase or create
live data. `esbuild` is a dev dependency for this isolated client fixture. It
reuses the local server on port 3000 or starts one there. Install the matching
browsers with `npx playwright install chromium webkit`. Firefox remains a manual
follow-up on a working host. PGlite and mocked Storage tests cover migration,
authorization, boundary/UTC dates, cleanup batches, stale workers/leases and
controlled race interleavings; hosted concurrency is not claimed.

### Upload and processing behavior

- Receipt and original owner QR images upload from the browser directly to the
  private `image-upload-staging` bucket. They retain their existing 10 MB limit.
  Next.js actions receive metadata and an upload ID, not the original image.
  This avoids Vercel's [4.5 MB function payload limit](https://vercel.com/docs/functions/limitations).
- Preparation binds a generated path to the bill, participant, and purpose.
  Owner QR preparation/completion both require the creator session and recovery
  cookie. No public storage policies or browser service-role keys are added.
- [Supabase upload tokens](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl)
  are valid for two hours, with overwrites disabled. Application completion
  expires after 15 minutes. The server checks actual bytes, size, format and
  dimensions before accepting an image. Client metadata is not trusted.
- Receipt completion copies the validated image to private receipt storage and
  atomically creates one scan. Repeated completion returns the same scan and
  does not schedule extraction twice. Drafts remain outside the financial ledger.
- QR completion returns the existing signed, cropped preview (at most 2 MB of
  image bytes). Recipient/currency confirmation and saving remain separate.
  The small cropped preview is allowed through Next.js; originals are not.
  Existing single/dual-currency and fixed-amount checks remain enforced.
- Forms show preparation/upload/processing states. Failed requests preserve the
  selected file; retries reuse a valid upload reservation when possible.
- The bill and receipt-review pages use Node.js with `maxDuration = 120`.
  Extraction has a 90-second overall processing deadline; Gemini retains its
  60-second request timeout. Claims and failure writes each have a 10-second
  network deadline, leaving headroom within the function budget.
- `after()` still runs extraction within the Vercel invocation; it is not a
  durable job queue. Uploaded or processing scans older than 150 seconds offer
  manual retry. Atomic claims and attempt IDs prevent late results/failures
  from overwriting a newer attempt.

### Cleanup

Receipt staging images are removed after successful finalization; rejected
images are removed when validation fails. QR originals are retained temporarily
for inspection retries. Preparation/completion also cleans up to 20 reservations
older than 24 hours, including their staging images and uncommitted receipt
copies. Completed receipt images remain under the normal receipt lifecycle.
Reservation records are retained long enough to clean files uploaded late using
the two-hour storage token. Cleanup failures retain records for another attempt.

The daily cron worker includes this cleanup once activated. Until then, or for
manual recovery on an idle project, use this private operator command with the
project's `.env.local`; repeat until it reports zero:

```bash
npm run uploads:cleanup
```

### Configure and deploy a preview

1. Commit/push the implementation to a testing branch such as `live-testing`.
2. In Vercel, import the GitHub repository. Select Next.js, repository root `.`,
   Node.js 22, install command `npm ci`, and build command
   `npm run build -- --webpack` (the verified production build).
3. Set these environment variables for Preview and Production from the matching
   existing Supabase project: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `PARTICIPANT_SESSION_SECRET`, and `GEMINI_API_KEY`.
   Optionally set `GEMINI_RECEIPT_MODEL`; leave
   `RECEIPT_EXTRACTION_DEV_FIXTURE` blank. Never commit `.env.local`.
4. Enable Fluid compute in Vercel. The page-level duration configuration covers
   their server actions; see [Vercel's runtime configuration](https://vercel.com/docs/functions/configuring-functions/duration).
5. Keep `main` as the production branch and create a preview deployment from
   `live-testing`. Check preview access settings so invited testers can open it.
   Changes to environment variables require a new deployment.
6. Use the branch's stable preview URL throughout a test. Create a fresh bill
   on that hostname; localhost/other-hostname participant and owner cookies do
   not transfer. Keep the creator's browser for owner QR settings.

### Validate before sharing

Run the local checks, then the opt-in hosted tests after migrations are applied:

```bash
npm run format:check
npm run lint
npm run test
npm run build -- --webpack
npm run test:e2e:uploads
npm run test:e2e:phase3
```

The upload browser test uses a generated valid PNG larger than 4.5 MB and checks
that the original bytes go only to Supabase. Start it with no existing dev
server on port 3100 so its development extraction fixture is enabled and no
Gemini quota is used. Fixtures are ignored in deployed production builds.
These browser tests create and clean synthetic bills/images in the configured
project; they are opt-in and have not been run against hosted Supabase yet.

On the deployed preview, manually test: create a bill; join from a second
browser/device; upload a receipt larger than 4.5 MB; review and confirm it;
inspect/save a real owner QR including KHR + USD; record a partial payment and
then settle the remainder. Verify one confirmed expense, correct shares, and
zero balances after settlement. A real Gemini request uses API quota; use a
redacted test receipt. Inspect Vercel logs for processing errors without copying
keys, upload tokens, bank payloads or receipt images into logs/chat.

## Sentry monitoring

Sentry is configured for **nathan-d2 / bill-splitter-webapp** using the official
Next.js SDK. Browser, Node.js and Edge initialization live in `src/`, with shared
configuration in `src/lib/sentry-config.js`. The checked-in DSN is a public
ingestion address, not an auth token. `NEXT_PUBLIC_SENTRY_DSN` can override it.

Errors are captured alongside sampled performance traces: 100% in development
and 10% in production builds, including previews. Vercel's environment and Git
commit SHA identify the environment/release; `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
and `SENTRY_RELEASE` can override these. Server actions exclude arguments and
responses. Unexpected handled failures are also reported; normal validation and
access errors retain their existing behavior.

### Private-data filtering

Identity, cookies, headers, request bodies, URL queries, database payloads, AI
inputs/outputs, queue arguments and stack-frame variables are disabled. Shared
bill links, receipt IDs and private storage paths are redacted. Arbitrary extras,
tags, breadcrumbs, logs and metrics are dropped. Unknown error messages become
generic messages or static operation labels; source-code stack frames remain
available for debugging. Session Replay and profiling are not configured.
Next.js/Vercel platform logs are separate and may contain request URLs; keep
access to those logs private.

### Source maps and deployment

1. Create a Sentry organization auth token with source-map upload permissions.
2. For local builds, save `SENTRY_AUTH_TOKEN=your-token` in the root file
   `.env.sentry-build-plugin`, beside `.env.local`. Next.js config loads this
   gitignored file. Never commit the token or paste it into chat.
3. Add `SENTRY_AUTH_TOKEN` to Vercel's **Preview and Production** environment
   variables before deploying. Vercel builds fail clearly if it is missing.
4. Run `npm run build -- --webpack`. The build uploads private source maps and
   deletes generated browser map files. Local/CI builds without a token still
   work but skip map uploads. Runtime error capture does not need this token.
5. When ready, deploy the changes and verify a fresh deployed error has a readable
   source file/line. Environment changes require a new deployment. No SQL
   migration is needed for Sentry.

Local development error capture, tracing and production-build source maps were
verified against Sentry. The synthetic production verification issue is
[BILL-SPLITTER-WEBAPP-3](https://nathan-d2.sentry.io/issues/BILL-SPLITTER-WEBAPP-3).
Temporary verification routes were removed. The SDK is deployed on Vercel,
and production receipt errors and traces have been observed in Sentry.

## Rate limiting

Shared limits run in the existing Supabase project. All Server Actions check a
300-request/minute IP guard before business queries. Authorized operations also
consume their applicable counters atomically. Ordinary bill pages are not gated.
These application limits do not replace network-level abuse protection.

| Operation                                                     | Limits                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Create bills                                                  | 10/10 minutes and 50/day per IP                                                          |
| Join, claim or add people                                     | 60/10 minutes per IP; 100/10 minutes per bill                                            |
| New receipt/QR upload reservations, combined                  | 20/10 minutes per participant; 60/10 minutes and 100/day per bill; 120/10 minutes per IP |
| Upload completion / repeat QR inspection                      | 60/10 minutes per participant; 180/10 minutes per bill                                   |
| Expense, settlement, receipt-confirmation and owner QR writes | 60/minute per participant; 300/minute per bill                                           |
| Receipt extraction, including retries                         | 10/10 minutes per acting participant; 30/hour per bill; **100/day across the app**       |

Limits use database-time fixed windows; daily windows reset at **00:00 UTC**
(07:00 Cambodia time). Fixed windows can allow bursts around their boundaries.
The private `rate_limit_policies` table is the single configuration for quotas
and window lengths. Preview, Production and local development using the same
Supabase project share counters and the app-wide scan cap.

### Migration and configuration

1. Pause receipt extraction and wait for existing attempts to finish.
2. Apply `supabase/migrations/20261021000000_rate_limiting.sql` once, after the
   direct-upload migration. The user applies hosted SQL manually. This creates
   private policies/counters, cleanup RPCs, `receipt_scans.next_retry_at`, and the
   atomic v3 extraction claim. It revokes service-role access to the old v2 claim;
   deploy the updated worker before resuming scans. A code-only rollback to the
   old worker cannot process receipts with this permission change.
3. Generate a server-only secret with `openssl rand -base64 32`. Save it as
   `RATE_LIMIT_SECRET` in `.env.local` and Vercel **Preview and Production**.
   Use the same value for deployments sharing this database. Never paste the
   secret into chat or prefix it with `NEXT_PUBLIC_`. Restart/redeploy afterward.
4. Deploy, create a fresh test bill, and verify normal actions and a controlled
   limit denial. The user reports migration/configuration are complete and both
   hosted concurrency tests passed. Release `32355c4` was confirmed deployed;
   a controlled deployed limit-denial check remains part of operational validation.

Vercel requests use only its validated `x-vercel-forwarded-for` header. IPs are
normalized and HMAC-hashed before storage; raw IPs, capability links, cookies,
images and upload tokens are excluded. Local requests use one fixed development
identity and ignore supplied forwarding headers. Secret rotation changes IP
counter identities, but does not reset participant, bill or global scan counters.

### Denials, outages and extraction

Blocked actions return an existing form/upload error plus `code: "rate_limited"`
and `retryAfterSeconds`. Inputs and valid upload reservations are retained; no
write or scan is automatically retried. Limiter requests have a five-second
network timeout. Missing configuration/migrations or store failures return
`rate_limit_unavailable` and stop protected actions, without a local fallback.
Bill viewing remains available if its existing data queries work. Unexpected
limiter failures go to Sentry under a static operation label; normal denials do
not create error issues.

Extraction quota and the attempt ID are claimed in one database transaction.
Duplicate/busy claims do not consume scan quota; each winning attempt counts,
even if image conversion, image download or Gemini later fails. The cap limits
attempts, not dollars. Application quota denial retains the image and saves a
retry time; the receipt page offers a wait message and manual expense entry.
If the claim store itself is unavailable, Gemini is not called and the existing
stale-scan retry remains available after 150 seconds. Repeated completion still
returns the same receipt without another reservation or extraction attempt;
request/completion limits continue to apply.

### Cleanup and checks

Each limiter call deletes up to 100 counter windows that expired over 24 hours
ago. With no traffic, cleanup waits for an operator; run and repeat until zero:

```bash
npm run rate-limits:cleanup
```

Offline tests cover counters, permission boundaries, extraction quota behavior,
retained form values and uploads. After applying the migration, explicitly run:

```bash
npm run test:integration:rate-limits
```

This opt-in hosted test uses synthetic counter subjects, a temporary bill and a
synthetic scan. It checks concurrent admission and extraction claims without
calling Gemini or uploading an image. It cleans its bill and private test
subjects. Its single winning claim consumes one app-wide daily attempt; it never
resets or decrements the shared global counter. Run it when scan quota remains.

## Deployed verification — Stage 6

Verified 2026-10-24 on the Production alias, release `eec047e`, with the initial
provider incident recorded below. The owner deferred
Preview limiter configuration; it remains a prerequisite only for Preview write
checks. Do not change it to start Production verification.

Use labelled synthetic bills and separate creator/guest sessions. Check sharing,
claiming, expenses/balances, one generated receipt, QR/payment records and a
bill/participant-scoped quota denial with retained input and natural-expiry retry.
Never change shared policies or exhaust IP/global quota to create a denial.
Remove only the generated fixtures afterward through the lifecycle flow; final
file sweeps keep their 24-hour deadline. Record provider requests separately from
application scan counters and leave credentials/hosting settings unchanged.

Current evidence is in HANDOFF: access/expense/QR/payment and scoped rate-limit
checks passed. The first deployed receipt attempt failed and manual entry worked;
its safe, source-mapped Sentry incident remains open because the exact upstream
reason was not retained. A separately approved local diagnostic and then one
approved fresh Production attempt succeeded. The deployed draft had zero expenses
before confirmation; confirmation created one correct expense, and the retained
image reopened in creator and separate sessions without reconfirmation controls.

Stage 6 functional checks are complete with the initial incident recorded as an
unresolved finding. Both synthetic bills/related rows and immediate files were
removed; six mandatory final sweeps remain queued until their Oct 25 deadlines.
Three provider requests were made in total (two deployed scans and one approved
local diagnostic); application extraction quota used=2 was preserved. No silent
retries, credential changes, deployment or shared quota/policy resets occurred.
Oct 24 follow-up verified original cleanup targets absent and no recurrence of
the single BILL-SPLITTER-WEBAPP-7 event. Oct 25 follow-up passed Stage 6 final
sweeps and retained-image preservation. Stage 4 still needs scheduled-run evidence
and three later final sweeps. The user will
perform the remaining manual/device/Firefox checks. Stage 7's evidence register
is in HANDOFF; Phase 4 remains open. Do not mark the Sentry incident fixed merely
because a retest passed; collect safe HTTP status/provider classification if it
recurs.

## Credential readiness — Stage 5

Reviewed 2026-10-23 (Asia/Phnom_Penh). This is a **readiness review and offline
rehearsal**, not a hosted rotation. See HANDOFF's Stage 5 inventory for observed
scopes, evidence and unresolved prerequisites. The owner confirms the exposed
Sentry token was revoked and replaced; no repeat rotation is requested. Stage 2
remains skipped. Local, Preview and Production share the Production backend;
Preview is not an isolated rehearsal destination.

### Common operating rules

The **owner** manages provider permissions, generates/stores replacement values,
updates ignored local files and hosted secrets, and authorizes future deployment
or retirement. The **implementer/operator** prepares the candidate, runs offline
checks and records safe verification evidence. All seven procedures below are
future operator instructions, not actions performed by this review.

Before any future change, record the credential label/type, consumers, scopes,
current release, compatible rollback release, verification criteria and change
time in HANDOFF. Use a password manager or provider secret store; never put
values, partial values, JWT payloads, fingerprints or private image links in
reports, shell history, screenshots or logs. Application HMAC secrets require
at least 32 bytes; generate 32 random bytes or more. The cron boundary requires
at least 32 non-whitespace characters. Keep all private keys server-only.

Change one credential family at a time. Update every deployment/branch override
that will remain active, plus local scripts; restart local processes. Environment
edits affect new Vercel deployments, not existing immutable deployments. Public
Next.js variables are baked into browser builds, so rebuild and refresh old
tabs. Audit older deployment URLs before retiring credentials. A rollback must
use compatible credential configuration, not merely an older commit. See
[Vercel environment variables](https://vercel.com/docs/environment-variables)
and the installed Next.js environment-variable guide.

Verify on a separately authorized deployment using controlled fixtures, scoped
checks and aggregate logs. Database/Storage/provider mocks establish application
behavior only; they cannot prove hosted permissions, hidden-value equality or
revocation. Never reuse a compromised key to recover service. For routine changes
only, a still-trusted old key may remain temporarily active until verification;
otherwise fix forward with another replacement and document access disruption.

### 1. Supabase public key

**Consumers:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the cached browser Storage client
and build-time environment validation. The project URL is a public coordinate;
this public key and Sentry's DSN are not private server credentials.

1. **Prerequisites/owner:** confirm the target project and all deployed/browser
   consumers, RLS policies and direct-upload flow. Modern keys already exist in
   this project; inventory their labels without copying values. Local keys are
   legacy-shaped; hosted key types remain unverified. The installed SDK passes
   the offline modern-key transport rehearsal, but hosted acceptance is untested.
2. **Update:** owner selects/creates the intended publishable key. Keep the
   existing environment-variable name, update Local/Preview/Production and any
   branch overrides, then build fresh releases. Do not change the project URL.
3. **Verify:** on an authorized candidate, check a fresh browser's signed receipt
   and QR uploads, completion, and bill access. Confirm no server key enters the
   bundle. Refresh old tabs; account for outstanding signed upload tokens (up to
   two hours), old bundles and reachable older deployment URLs.
4. **Retire:** only after auditing remaining consumers. The legacy disable control
   covers legacy API keys; do not disable it while any server/script still uses
   `service_role`. Do not rotate the project's JWT signing secret as a shortcut.
5. **Failure recovery:** retain the trusted old public key during a routine
   transition; rebuild with it if necessary. When retired, rebuild with a working
   current key instead of promoting an incompatible old build.

Supabase supports legacy/modern coexistence and maps the public replacement to a
publishable key. See the
[official migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

### 2. Supabase server key

**Consumers:** `SUPABASE_SERVICE_ROLE_KEY`, cached server clients, receipt/QR
Storage operations, the scheduled worker and the three local cleanup scripts.
This key has elevated access and bypasses RLS.

1. **Prerequisites/owner:** enumerate every backend consumer and any provider-side
   integrations outside this repo. Check installed SDK compatibility offline;
   confirm hosted key type, permissions and candidate acceptance separately.
   New secret keys are not JWTs; audit custom Authorization headers, webhooks and
   Edge Functions before a future migration. This app passes keys to the SDK.
2. **Update:** owner creates/selects a server secret in the same project and
   replaces the value under the existing variable name in all relevant scopes
   and ignored local files. Deploy/restart all retained consumers. Pause scheduled
   cleanup and drain in-flight runs while coordinating the worker's cutover.
3. **Verify:** authorize separate read/write and Storage-signing/upload checks;
   verify the worker's disabled/auth gates first. An enabled probe can delete due
   work, so inspect its scope and authorize it separately. Keep receipt retention,
   active bill access and cleanup queue deadlines intact.
4. **Retire:** confirm app, worker, scripts and external integrations no longer
   use the old key. Legacy deactivation also requires the public-key audit above;
   deleting a modern secret is irreversible. Resume the schedule only after the
   new worker configuration is verified.
5. **Failure recovery:** leave cleanup paused while fixing deployment/configuration.
   A routine rollback may use a still-trusted active key; after retirement or
   compromise, deploy a working replacement. Do not delete data, alter RLS or
   change the JWT signing secret to solve a credential mismatch.

See [Supabase API-key rotation](https://supabase.com/docs/guides/getting-started/api-keys).
No hosted migration to modern keys was performed in Stage 5.

### 3. Participant session signing key

**Consumers:** `PARTICIPANT_SESSION_SECRET`, optional
`PARTICIPANT_SESSION_PREVIOUS_SECRET`, participant cookies and ten-minute QR
preview signatures. Share/recovery capabilities and database session-token
hashes are independent of the signing key.

1. **Prerequisites/owner:** confirm this is routine rotation, both keys are trusted,
   no previous generation still needs the fallback, and every retained deployment
   can accept the intended key pair. Generate new key B privately; label existing
   key A without recording values. Pause cutover if A/B cannot fit safely into
   the two configured slots.
2. **Bridge:** deploy current=A, previous=B to every deployment that will remain
   in use. It still issues A cookies but accepts B. Older A-only URLs must be
   protected/drained or retired; a code rollback to A-only rejects B cookies.
3. **Cut over:** deploy current=B, previous=A consistently. Verify both generations
   through participant writes and creator operations; creator access requires a
   valid participant session **and** the private recovery cookie. Refresh tabs
   hitting older deployments; record the **last possible A issuance**, including
   old deployments/local processes sharing this database.
4. **Retire:** cookies last 365 days and reads/writes do not refresh them. For
   uninterrupted access, retain A until all A cookies expire, potentially 365
   days after its final issuance. Earlier retirement invalidates those sessions
   and can lock creators out; a recovery cookie alone is insufficient. No new
   recovery/renewal flow is implemented. A third generation cannot be introduced
   safely while both A and B are still required by the current two-key design.
5. **Failure recovery:** for trusted keys, a bridge-compatible rollback can issue
   A while still accepting B; include its new A issuance in the retirement date.
   If a key is compromised, remove trust rather than retaining it for continuity;
   session invalidation and recovery impact require an incident-specific decision.

QR preview verification uses only the current key, not the participant fallback.
After a switch, inspect an unsaved QR image again. Saved QR files, bills, expenses
and balances are unaffected by signing-key replacement. Old deployment URLs
issuing previews must be addressed along with cookies.

### 4. Rate-limit secret

**Consumers:** `RATE_LIMIT_SECRET`, request/action IP HMACs. It does not sign
sessions or identify bill/participant/global quota subjects.

1. **Prerequisites/owner:** resolve missing Preview configuration before Preview
   write verification. Confirm all retained deployments sharing the backend use
   the same trusted key; metadata alone cannot establish equality. Generate a
   replacement of at least 32 bytes privately.
2. **Update:** coordinate the same replacement across Production, Preview, branch
   overrides and local files; deploy/restart and drain/protect older URLs. There
   is no previous-key fallback. Mixed versions can give one IP separate allowances.
3. **Verify:** offline tests demonstrate changed IP hashes, stable bill/actor
   subjects, preserved global counters and fail-closed missing configuration.
   A future deployed denial test must use controlled fixtures; never exhaust
   shared global quota just to verify rotation.
4. **Retire:** confirm no retained process uses the old key. Old IP windows remain
   until normal expiry/cleanup. Do not delete counters, reset policies or claim
   the change preserves existing IP allowance usage.
5. **Failure recovery:** restore a still-trusted consistent key and redeploy, or
   fix forward if compromised. Another switch changes IP identities again;
   bill/participant/global counters remain enforced. Reads can still work while
   protected writes fail closed with a missing/short key.

### 5. Gemini API key

**Consumers:** `GEMINI_API_KEY`, server receipt extraction through the
`x-goog-api-key` header. The optional model setting is configuration, not a key.

1. **Prerequisites/owner:** confirm the identified AI Studio key/project, key type,
   API/application restrictions, billing/quota and required permissions. Record
   metadata only; do not infer the hidden Vercel value from its presence. For a
   future key, retain the intended Cloud project and restrict Gemini access.
2. **Update:** owner creates the replacement and updates Local/Preview/Production
   plus overrides. Deploy/restart server consumers; a new key in the same project
   does not establish a new independent quota budget.
3. **Verify:** offline 401/403-to-success rehearsals use mocked HTTP and disposable
   keys. Later authorize one generated/redacted receipt extraction on the candidate,
   recording quota usage, review/manual-entry behavior and safe error codes.
   Existing provider-auth failures are nonretryable until configuration is fixed.
4. **Retire:** after all consumers use the replacement, owner disables/deletes the
   old provider key and checks usage. Do not assume older deployments gained the
   new key merely because environment settings changed.
5. **Failure recovery:** use a still-trusted old key temporarily or fix forward;
   preserve the receipt draft for retry/manual entry. Never log key-bearing
   headers, provider responses or receipt contents for diagnosis.

Current Google guidance distinguishes authorization keys from restricted standard
keys; inspect actual metadata rather than assuming a blanket standard-key expiry.
See [Gemini API-key guidance](https://ai.google.dev/gemini-api/docs/api-key).

### 6. Sentry source-map token

**Consumers:** `SENTRY_AUTH_TOKEN`, Vercel Preview/Production builds and the ignored
local `.env.sentry-build-plugin`. Runtime capture uses the public DSN, not this
token. The owner's prior revocation/replacement is **resolved by user report**;
this stage does not create another token or independently exercise the revoked one.

1. **Prerequisites/owner:** confirm replacement token metadata targets `nathan-d2`
   / `bill-splitter-webapp` and has source-map/release upload permissions. Prefer
   an organization CI token; verify its scopes rather than expanding permissions
   speculatively. See [Sentry permissions](https://docs.sentry.io/api/permissions/).
2. **Update:** for a future rotation, owner updates both Vercel scopes, overrides
   and the ignored build-token file, then starts fresh builds. Keep the DSN and
   runtime monitoring configuration intact.
3. **Verify:** on a separately authorized build, check upload success and matching
   release/artifact metadata, then a readable known/synthetic stack trace without
   private inputs. A successful local build with uploads disabled proves neither
   token validity nor provider revocation.
4. **Retire:** owner revokes the old token after verifying all build consumers.
   The already reported exposed token stays revoked; do not rotate it again.
5. **Failure recovery:** correct permissions/project/configuration or issue another
   token. Retain the last working deployment while builds are repaired; do not
   restore an exposed token. Runtime capture does not require the build token.

### 7. Cron bearer secret

**Consumers:** Production-only `CRON_SECRET`, Vercel scheduler and
`GET /api/cron/lifecycle-cleanup`. The handler accepts one secret; it has no
previous-key fallback. Keep the enable flag, project ref and deadlines intact.

1. **Prerequisites/owner:** generate at least 32 random non-whitespace characters
   privately; review the current release, queue and schedule. The recently created
   key needs no additional rotation during this readiness review.
2. **Pause/update:** disable the project's Cron Jobs control, deploy the application
   flag false, and drain any in-flight invocation (up to 300 seconds). Owner updates
   the Production secret, then redeploys with cleanup still disabled. Vercel supplies
   the configured secret as a Bearer header; see
   [cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
3. **Verify:** on that future disabled deployment, unauthenticated/old-secret GETs
   must return 401, the new secret 503, and other methods 405, all no-store. Use
   a trusted operator tool without exposing the secret. An enabled successful
   request runs real cleanup; inspect eligible work and authorize any manual
   probe separately. No such probe is performed in Stage 5.
4. **Activate/retire:** enable the application flag through a new deployment,
   verify the intended release/configuration, then re-enable project Cron Jobs.
   Verify the first scheduled invocation and safe aggregate results. Old callers
   must use the new secret; older immutable deployments retain old settings and
   need protection/retirement. Vercel's project cron-disable setting persists
   across deployment rollbacks; explicitly check it before resuming.
5. **Failure recovery:** disable project Cron Jobs and deploy the flag false;
   let leases expire normally and fix credentials/configuration before resuming.
   Never bypass bearer checks, shorten final-sweep deadlines or restore a leaked
   secret. Queued work retries after a later successful authorized run.

### Offline rehearsal and acceptance

Run without hosted integration flags or real provider calls:

```bash
RUN_SUPABASE_INTEGRATION=0 RUN_GEMINI_INTEGRATION=0 RUN_RATE_LIMIT_INTEGRATION=0 npm test
npm run lint
npm run format:check
SENTRY_AUTH_TOKEN='' npm run build -- --webpack
git diff --check
```

The credential cases cover the full session bridge/cutover/retirement matrix,
exact cookie expiry, tampering/cross-bill rejection, creator/recovery checks,
QR reinspection, limiter identity/counter preservation, mocked Gemini key
replacement, cron key replacement/configuration gates, and modern Supabase SDK
RPC/Storage transport. PGlite provides database isolation; no test backend is
provisioned. Existing lifecycle tests cover database creator authorization and
preservation of unrelated records. No application/API/schema changes are needed.

Readiness implementation is reviewable when these checks pass and the evidence
inventory lists every unresolved provider prerequisite with an owner/action.
Hidden credential equality, live replacement acceptance and revocation remain
separate hosted verification. Do not describe an offline rehearsal as a completed
Production rotation. Stage 4's scheduled invocation/final-sweep checks and broader
Stage 6 deployed checks remain separate.

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
| `last_activity_at`          | `timestamptz` | Required timestamp of the latest qualifying successful change.     |
| `archived_at`, `expires_at` | `timestamptz` | Nullable archive timestamp and inactivity deadline.                |
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

Only one expense may reference a confirmed scan, enforced by a unique constraint on `expenses.receipt_scan_id`. Confirmation accepts an idempotency key so browser or network retries return the existing expense instead of creating a duplicate. Unconfirmed scans become inaccessible after 24 hours and eligible for cleanup. Confirmed receipt images remain until bill deletion, with their structured items and financial records. Storage removal is performed by the retryable lifecycle
cleanup; daily scheduling is enabled in Production (Stage 4 details above).

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
  KHQR field structure and CRC, recognizes USD/KHR encoded currency, rejects
  unreadable/multiple symbols and automatic fee fields, and crops the image.
  The owner confirms the recipient and accepted currencies in a preview valid for ten
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

**Dual-currency owner QR update (2026-10-19):** Apply
`supabase/migrations/20261019000000_dual_currency_payment_qrs.sql` after the
original Phase 3 migration. This preserves existing QR records and allows an
amount-free QR to store both KHR and USD as its accepted currencies. Hosted
application of this migration is pending; the user applies migrations manually.

An amount-free QR that encodes KHR can now be inspected on a USD bill (and vice
versa). The preview displays **Encoded currency** and offers **Currencies this
QR accepts**: keep the encoded currency only, or confirm **KHR + USD** after
checking the choices in the banking app. The decoded default currency alone
does not prove both currencies are enabled. This supports the receiving options
described by [ABA's dual-currency QR guide](https://www.ababank.com/aba-mobile-app/aba-id/).
The app does not query bank accounts or modify the uploaded QR payload.

The confirmed options must include the bill currency. Fixed-amount QRs remain
restricted to their encoded currency and exact amount; the client, server, and
database reject a fixed amount combined with two currencies. Re-uploading the
same QR can correct its accepted-currency selection. When paying, select the
bill currency in the banking app, even if the QR defaults to the other currency.
The new `save_bill_payment_method_v2` RPC stores the selection atomically; the
original RPC remains available for existing clients and removal.

### Phase 4 — Hardening and launch

Sentry monitoring and rate limiting are implemented and deployed. The user has
removed the Privacy & Help page and privacy/support content from the remaining
work. Two workstreams remain:

- **Mobile and accessibility:** responsive/focus/error fixes are deployed and
  earlier automated axe/keyboard/reflow/emulation checks passed. Reconcile existing
  manual results, then finish only unverified real-device, VoiceOver/TalkBack,
  full keyboard and Firefox checks. See the checklist above and HANDOFF.
- **Operational checks:** Stage 2 backup/restore was skipped by the user. Verify migrations and key rotation,
  expiration, upload cleanup and permanent deletion. Include a controlled
  deployed rate-limit denial and final checks of the main app flows.

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
5. Should unused bills expire automatically? **Agreed: expire after 12 calendar months without a qualifying change, show an inline warning during the final 30 days, and become immediately eligible for deletion at expiry.**
6. Should optional accounts be postponed until users request cross-device sync or recovery? **Proposed: yes.**
7. How should tax, tip, and discounts be shared? **Proposed: proportional to each person's assigned item subtotal by default, with equal and custom alternatives.**
8. How long should confirmed receipt images be retained? **Agreed: retain confirmed images until bill deletion. Unconfirmed drafts expire after 24 hours.**

Confirming these access and retention decisions is the final planning gate before application scaffolding begins.
