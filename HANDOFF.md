# Bill Splitter — Computer Handoff

Read this file and `CURRENT_WORK.md` when resuming.
Current branch: `main`. The earlier `work/mobile-accessibility-lifecycle` branch
contains the same saved changes.
Phase 3 implementation is included in this checkout; use `git log -1` for the
latest commit. Check out/pull `main` and run `npm ci` when moving to another
computer.
The user wants migration SQL saved in `supabase/migrations/` and will apply
hosted migrations themselves. Tell them when a new migration is required.

## Resume here — Stage 6 functional checks complete; one provider incident open

Stage 6 functional verification completed **2026-10-24, 00:23–00:48 GMT+7
(Asia/Phnom_Penh)** on `main`, with the first upstream receipt incident recorded
as unresolved rather than silently treated as fixed.
User explicitly **deferred Preview RATE_LIMIT_SECRET configuration** and asked to
move on. Leave Preview unchanged; test Production. Preview write verification
remains unperformed, not a prerequisite for these Production checks. Stage 5
readiness is complete and committed at `eec047e`; Stage 2 remains skipped.

### Stage 6 evidence and results

- **Confirmed target:** Chrome Vercel overview showed Ready Production deployment
  [EBRMBcGuWB75FThg1UBPHURMzZud](https://vercel.com/nacarees-projects/bill-spiltter-webapp/EBRMBcGuWB75FThg1UBPHURMzZud),
  commit `eec047e9435a5ac4c88ff26cc22b81f47614c485`, normal alias
  `https://bill-spiltter-webapp.vercel.app/`, immutable hostname
  `bill-spiltter-webapp-fpto6rz1m-nacarees-projects.vercel.app`.
  No deployment or environment edit was performed by the agent.
- **Initial synthetic fixture:** one bill named `Stage 6 synthetic 2026-10-24 0025`,
  USD, `Stage6 Owner` and `Stage6 Guest`. Chrome normal/incognito sessions keep
  creator and guest separate. No existing customer bill was modified.
- **Passed UI:** create, add reserved guest, open link separately, view without
  write access, claim reserved identity, persist guest session across reload,
  guest expense $10 split $5 each, shared creator view after refresh.
- **Receipt failure confirmed:** one generated, noncustomer PNG uploaded through
  the real deployed direct-upload flow. Reservation completed and exactly one
  scan/attempt was recorded. The scan failed with `error_code=provider_failed`.
  The page showed extraction failure, Retry extraction and manual-entry fallback.
  No immediate automatic retry was submitted. A later fresh Production attempt
  was separately approved and is recorded below.
- **Passed fallback:** creator manually entered the generated receipt's $12 total,
  split $6 each. Draft failure did not create an automatic financial record;
  manual entry created one expense. Net guest debt became $1 as expected.
- **Passed QR/payment UI:** uploaded a generated nonpayable test KHQR, inspected
  its KHR default, confirmed dual KHR/USD support and saved it as owner. Guest
  lacked owner QR/deletion controls and could open the eligible $1 owner QR.
  Opening left payment history empty. A labelled synthetic $1 payment settled
  both balances; correction to $0.50 restored $0.50 guest debt. No bank app or
  actual transfer was used.
- **Passed scoped denial/recovery:** filled only the synthetic guest's current
  `write_actor` counter to its existing quota (60/60s). Did not alter policies,
  IP/global/other-bill counters or deadlines through that seed; ordinary actions
  still consumed their normal applicable quotas. Guest expense submission was denied
  with a 45-second retry instruction; title and $2 input remained populated.
  After natural window expiry, the same form succeeded once. UI and fixture
  metadata show three expenses, one settlement and one saved payment method.
- **Monitoring confirmed:** one real handled error in this test window,
  [BILL-SPLITTER-WEBAPP-7](https://nathan-d2.sentry.io/issues/BILL-SPLITTER-WEBAPP-7),
  event time `2026-10-23T17:27:05.797Z`, release `eec047e…`, operation
  `receipt_extract`. Readable source maps point to `receipt-extraction.js:311`,
  the non-2xx HTTP branch, not JSON parsing or schema validation of a success
  response. Exact upstream HTTP status/body were not retained by current error
  reporting. Trace has one error and no retained spans/logs. Do not mark resolved
  or invent a root cause from the generic code.
- **One extra diagnostic authorized by user:** direct call using only the generated
  PNG and the current **local** key/model returned **HTTP 200**, two items and
  total 1200 cents, model `gemini-3.5-flash-lite`. One request exactly. This did
  not create a second application scan or increment application extraction
  counters. It does not establish equality with Vercel's hidden configuration.
- **Initial quota accounting:** application extraction counter was empty before
  upload and used=1 afterward. The local diagnostic made one separate provider
  request without charging the application scan counter. Final totals, including
  the explicitly approved fresh deployed attempt below: **3 provider requests,
  2 application scans/attempts**, preserved application extraction counter used=2.
  No quota resets or silent retries.
- **Read-only baseline after creating fixture:** 20 bills (19 existing + fixture),
  eight confirmed receipts. No confirmed receipt was created by the failed scan.

### Approved Production receipt recheck and cleanup

- **Confirmed owner authorization:** user approved one fresh Production receipt
  attempt after the local diagnostic. Used a second labelled USD bill,
  `Stage 6 synthetic receipt recheck 2026-10-24`, with Stage6 Owner/Stage6 Guest
  and the same generated, noncustomer PNG. No credential/configuration change.
- **Confirmed model metadata:** owner completed Vercel email verification. Agent
  read only the non-secret Config value `GEMINI_RECEIPT_MODEL`, currently
  `gemini-3.5-flash-lite` for Production/Preview, matching local. No key revealed,
  no settings changed. Hidden credential equality remains unverified.
- **Passed deployed extraction:** one attempt returned a reviewable Gemini draft:
  Noodles 1 x $5=$5, Drinks 2 x $3.50=$7, subtotal/printed total $12, adjustments
  zero. Before confirmation, SDK metadata showed `needs_review`, attempt_count=1,
  completed reservation and **zero expenses**. Low-confidence review wording was
  present, so inferred items were not silently accepted.
- **Passed confirmation:** reviewed matching totals and both participant shares,
  submitted once. Metadata showed exactly one confirmed scan and one expense;
  bill ledger showed $12, $6 each, owner owed $6 / guest owing $6.
- **Passed retained viewing:** reopened from the ledger's View receipt link and
  from a separate incognito session using the same private bill capability.
  Both showed Receipt confirmed + Uploaded receipt, no missing-image fallback,
  and no confirmation form. Existing stale cookies from the first deleted bill
  did not need to be reused as a session for this read-only shared-link view.
  `ReceiptImage` replaces failed loads with an announced fallback; the image
  remained available after reopening. No reconfirmation/provider call was made.
- **First fixture cleanup confirmed** at **Oct 24 00:38:43 GMT+7**: exact-bill
  lifecycle deletion removed bill/participants/three expenses/one settlement/
  failed draft/two reservations/QR metadata. Immediate scoped file work:
  processed=3, failed=0, waiting=3; all three bucket folders verified empty.
  Three final sweep deadlines remain, latest **Oct 25 00:38:43 GMT+7**.
- **Second fixture cleanup confirmed** at **Oct 24 00:48:02 GMT+7**: exact-bill
  lifecycle deletion removed its confirmed scan/expense/participants/reservation.
  Immediate scoped file work processed=3, failed=0, waiting=3. Verified all related
  row counts zero and all three bucket folders empty. Its three final sweep
  deadlines remain, latest **Oct 25 00:48:02 GMT+7**. No unrelated jobs claimed.
- **Final aggregate verification** at **Oct 24 00:48:17 GMT+7**: 19 existing bills,
  eight existing confirmed receipts (baseline preserved), both synthetic bills
  absent, application extraction used=2. Pending file jobs=19, due=0: original
  13 plus six fixture final sweeps. Deadlines were not moved forward/bypassed.
- **HTTP access checks passed:** root 200; malformed and unknown capability URLs
  404; unauthenticated cleanup GET 401 and HEAD 405, no-store. No authorized cron
  invocation ran during Stage 6. Final Sentry aggregate still showed only the
  original receipt_extract event, not a second failure or a rate-denial error.
- **Local changes:** documentation only (README/HANDOFF/CURRENT_WORK). Prior 293
  offline tests, eight hosted/provider skips, lint and source-map-disabled build
  remain the Stage 5 baseline; no application code changed to repeat them.
  Formatting and diff checks passed. No commit/push, migration or deployment in
  this Stage 6 session. Native Chrome/SDK checks above are actual hosted evidence,
  separate from the earlier offline suite.

### Remaining findings and next actions

- **Unverified cause / open incident:** first receipt attempt received an upstream
  non-2xx response; exact status/reason were not retained. Both the local diagnostic
  and approved new Production attempt succeeded afterward. Do not assert a model
  mismatch, broken credentials or a proven transient cause. Keep
  [BILL-SPLITTER-WEBAPP-7](https://nathan-d2.sentry.io/issues/BILL-SPLITTER-WEBAPP-7)
  unresolved; no fix was made or deployed. Owner/operator: monitor recurrence;
  if it recurs, collect allowlisted HTTP status/provider error classification
  without keys, response bodies or receipt contents before proposing a fix.
- **Stage 6 functional scope complete with this incident recorded:** normal flows,
  real receipt review/confirmation/retained viewing, failure fallback, scoped
  quota denial and retry passed; both fixtures and their immediate files are gone.
  This is not a declaration that Phase 4/reliability closeout is complete.
- **Stage 4 still pending:** at these checks it was before Oct 24 02:30 GMT+7.
  Verify first time-triggered invocation and original 13 final sweeps after that
  deadline; separately cover the six new fixture sweeps after their Oct 25
  deadlines. Queue/file absence and an existing active confirmed receipt opening
  remain to be checked after the relevant sweep. Do not manually delete/accelerate
  future jobs or treat queue growth from test deletion as a cleanup failure.
- Mobile/accessibility follow-up is limited to the unverified checks below;
  Stage 7 closeout also remains. Preview configuration stays deferred by the
  user; it was not changed or tested. No
  app/API/schema, credentials, shared policies, expiry or hosting settings changed.

### Mobile/accessibility clarification — 2026-10-24

- **Confirmed:** mobile/accessibility fixes are implemented and included in the
  deployed `eec047e` checkout. Earlier automated checks covered axe, keyboard/focus
  behavior and narrow-screen reflow; the Stage 3 lifecycle suite recorded 10 passes
  across Chromium/WebKit desktop, 320px Chromium and Android/iPhone emulation.
  Stage 6 also completed the deployed functional journeys recorded above. Do not
  describe all mobile/accessibility work as unfinished or repeat completed checks
  merely because the manual evidence is incomplete.
- **Unverified:** actual iPhone/Safari and Android/Chrome behavior with device
  keyboards/file pickers, orientation and large text; VoiceOver/TalkBack journeys;
  the full manual keyboard journey; and Firefox (local launch failures). Emulation
  and focused automated keyboard checks do not establish these results. The user
  asked whether this was already done; no new specific manual result was supplied.
  Next agent/operator: first reconcile any existing user results, recording device,
  browser, assistive technology and outcome; perform only the remaining checks.
- **Evidence:** repository review on 2026-10-24 of the Stage 3 validation and dated
  mobile section below, README's mobile checklist and Stage 6 results. This update
  adds no browser/device test or hosted operation. Remaining cleanup verification
  and the open provider incident above are separate from mobile/accessibility.

## Stage 5 credential readiness — completed

Status refreshed **2026-10-23, 03:26 GMT+7 (Asia/Phnom_Penh)** on existing
`main`. Stage 5 contains documentation and offline tests only; no runtime/API,
schema, credential, hosted-setting or deployment changes. Later saved on the
existing branch in commit `eec047e`; Stage 6 verifies its deployed release above.
Stage 2 remains explicitly skipped. **User previously reported applying the
Stage 3 lifecycle migration**; this stage adds no migration.

- Seven replacement runbooks are in README, **Credential readiness — Stage 5**.
  Each includes consumers, prerequisites/owner, update order, verification,
  retirement and failure recovery. These are future operator instructions,
  not evidence of actual rotations. Use the inventory below before any cutover.
- **Sentry exposure resolved by user confirmation:** user states the old token
  was revoked and a new token generated. Do not request another revocation or
  describe it as still unconfirmed. Hosted token identity/scopes and a new
  source-map upload were not independently verified in this readiness review.
- **Missing:** Preview `RATE_LIMIT_SECRET` remains absent in Vercel's current
  metadata. Owner must coordinate the same trusted limiter key across retained
  shared-backend deployments and redeploy before Preview write checks. Do not
  silently fix it as part of this readiness task.
- **Confirmed:** Supabase has modern publishable/secret keys available alongside
  enabled legacy keys. Local public/server keys are legacy JWT-shaped; hosted
  hidden key types/equality are unverified. Installed-SDK transport works with
  disposable modern keys offline; this does not establish hosted acceptance.
- **Confirmed by user mapping + provider metadata:** Bill Splitter's Gemini key
  label is **FixFirst**, in **Default Gemini Project** /
  `gen-lang-client-0617951019`. It is service-account-bound, Available, restricted
  to Gemini API, with application restrictions **None**. No key values/suffixes
  were saved in this report, and nothing was edited or submitted.
- Session rotation needs care: cookies last 365 days, no read/write refresh
  exists, and creator recovery alone cannot bypass an invalid session. Retiring
  A early can lock creators out. The runbook covers the current/previous bridge,
  old deployment/rollback compatibility and current-key-only QR previews. No
  signing-key or session behavior was changed.
- **Offline validation:** 293 tests pass, 8 hosted/provider tests skipped (43
  passing files). Added 13 credential cases: mocked modern Supabase SDK RPC/Storage,
  session overlap/retirement and creator authorization, QR reinspection, limiter
  preservation, Gemini replacement and cron rejection. Lint and webpack
  production build passed with external source-map uploads disabled. Full-repo
  formatting and final diff checks passed; only documentation/test files changed.
- Stage 4 remains enabled per its last verified rollout, with first scheduled
  invocation, final sweeps after **Oct 24 02:30 GMT+7**, file absence and an active
  confirmed-receipt UI check still pending. None were triggered by Stage 5.
  Stage 6 deployed flows and real-device/screen-reader/Firefox checks remain.
  Privacy/support content remains off the to-do list.

### Stage 5 evidence inventory

Observation window **2026-10-23 03:20–03:26 GMT+7**. Local inspection emitted only
presence and Supabase key-type classifications, no values/payloads/fingerprints.
Chrome inspection used metadata only; no credential Reveal/Copy/Save/Create/
Rotate/Delete action was taken. Presence does not establish hidden equality or
effective permissions. No new credential was generated, entered or submitted.

- **V:** [Vercel variables](https://vercel.com/nacarees-projects/bill-spiltter-webapp/settings/environment-variables),
  all-environment/all-variable list: 11 entries. Shared tab: no linked variables.
  No Development scope or branch-specific entry was shown; immutable deployment
  settings were not inspected. URL/public key/server key/session/rate/Gemini/
  Sentry/cron entries are Secret type; model and lifecycle configuration are
  Config. The URL and public key are public information despite the saved type.
- **L:** ignored `.env.local` / `.env.sentry-build-plugin`, `src/env.js`,
  `src/lib/{participant-session,payment-qr,supabase-server,direct-image-upload,receipt-extraction}.js`,
  server bills/payment-methods/rate-limits/scheduled-cleanup, local cleanup
  scripts, `next.config.mjs` and installed Next.js environment-variable guide.
- **S:** [Supabase API keys](https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh/settings/api-keys)
  and Legacy tab; project `bill-spilter`, public URL/ref confirmed. Both modern
  default key types exist; legacy tab offers Disable, so legacy API keys remain
  enabled. No key action was taken.
- **G:** [AI Studio](https://aistudio.google.com/api-keys), user identified the
  Bill Splitter row; [Cloud key metadata](https://console.cloud.google.com/apis/credentials/key/79abb31d-c8e4-4af0-89d3-64bfce5ac7fc?project=gen-lang-client-0617951019).
  FixFirst, created Jun 30 2026, service-account-bound, one selected API (Gemini),
  application restriction None. Exited details with Cancel. AI Studio listed
  Free tier; live billing/quota/permissions were not independently established.
- **U:** current conversation: Sentry revocation/replacement confirmation and
  Gemini row identification. Earlier user confirmation maps Local/Preview/
  Production to shared project `uvznqgkbodejvksmtafh`.

| Credential / configuration                            | Local                        | Production         | Preview            | Status, evidence and next action / owner                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------------- | ------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Present, legacy-shaped       | Present            | Present            | **Confirmed** presence (L/V), modern public key available (S); **unverified** deployed type/pairing. Owner: attest type and retained consumers before future migration; operator: separately verify signed browser uploads.                                                                                                                   |
| Supabase server key (`SUPABASE_SERVICE_ROLE_KEY`)     | Present, legacy-shaped       | Present            | Present            | **Confirmed** presence (L/V), modern secret available/legacy enabled (S); **unverified** hosted type/permissions. Owner: audit app/cron/scripts/external integrations; operator: separately validate candidate RPC/Storage before retirement.                                                                                                 |
| `PARTICIPANT_SESSION_SECRET`                          | Present                      | Present            | Present            | **Confirmed** presence (L/V); **unverified** equality/entropy. Owner: coordinate retained deployment scopes before future bridge/cutover; no automatic cookie renewal exists.                                                                                                                                                                 |
| `PARTICIPANT_SESSION_PREVIOUS_SECRET`                 | Absent                       | Absent             | Absent             | **Confirmed** optional fallback absent (L/V). Operator/owner: follow README bridge and 365-day retirement criteria for a future routine rotation.                                                                                                                                                                                             |
| `RATE_LIMIT_SECRET`                                   | Present                      | Present            | Absent             | **Missing** in Preview (V); **unverified** Local/Production equality. Owner: separately configure the intended consistent key and redeploy before Preview writes; do not reset counters/policies.                                                                                                                                             |
| `GEMINI_API_KEY`                                      | Present                      | Present            | Present            | **Confirmed** presence (L/V); FixFirst mapping **user-confirmed** (U); binding/restrictions **confirmed** (G). Hidden equality and live permissions/quota **unverified**. Owner: confirm billing/quota and bound-account permissions before replacement; operator: separately authorize synthetic extraction.                                 |
| `SENTRY_AUTH_TOKEN`                                   | Present in build-plugin file | Present            | Present            | Old-token revocation/replacement **user-confirmed** (U), exposure resolved; scoped presence **confirmed** (L/V). Token identity/scopes/upload validity **unverified**. Owner: confirm replacement targets nathan-d2 / bill-splitter-webapp with CI upload scope; operator: verify artifacts/readable frames on a separately authorized build. |
| `CRON_SECRET`                                         | Absent                       | Present            | Absent             | Scope/presence **confirmed** (L/V); local/Preview absence intentional. Value/entropy not inspected; earlier enabled probe remains historical evidence. Owner: leave unchanged; use paused/disabled cutover only if later needed.                                                                                                              |
| `NEXT_PUBLIC_SUPABASE_URL`                            | Shared project URL           | Present            | Present            | Local public URL **confirmed** (L/S), shared hosted mapping **user-confirmed** (U). Hidden deployed equality **unverified**. Operator: no target change; treat all scopes as Production data/quota.                                                                                                                                           |
| `GEMINI_RECEIPT_MODEL`                                | Present                      | Present            | Present            | Config presence **confirmed** (L/V), not a credential. Operator: retain model during key-only replacement to isolate verification.                                                                                                                                                                                                            |
| Lifecycle enable/project-ref                          | Absent                       | Both present       | Absent             | Scoped presence **confirmed** (L/V), not credentials. Stage 4 records last verified true / uvznqgkbodejvksmtafh values. Operator: leave settings/target/deadlines unchanged.                                                                                                                                                                  |
| Sentry DSN                                            | Repository default           | No listed override | No listed override | Public ingestion coordinate **confirmed** in repository (L/V), not the auth token. Owner/operator: no change.                                                                                                                                                                                                                                 |

### Stage 5 acceptance and follow-ups

Seven runbooks and offline rehearsals implement readiness, **not hosted
credential replacement**. No essential dashboard was inaccessible. Provider
permissions, hidden equality and live acceptance remain explicitly unverified
by design. Missing Preview limiter configuration blocks Preview writes and any
hosted rehearsal requiring them; it does not block offline readiness tests.

Before future live rotation, owner must confirm stored-value provenance,
provider labels/types/scopes, retained deployment consumers and verification
destination. If any cannot be established, stop that credential's cutover/
retirement and record the missing evidence; do not reveal values to resolve it.
No isolated backend was provisioned. No session renewal/third key slot, modern-key
migration, counter reset, cron probe or credential change was performed.

## Stage 4 rollout evidence — daily cleanup enabled; successful Production probe

Status refreshed **2026-10-23 (Asia/Phnom_Penh)**. Current branch remains `main`;
existing uncommitted documentation and mobile/accessibility work were preserved.
No new migration is required. Stage 2 remains skipped.

- User changed the initial manual-first decision to **daily Vercel automation for
  all agreed cleanup**, then explicitly requested implementation of the plan.
- Added `/api/cron/lifecycle-cleanup` and `vercel.json`, schedule `0 20 * * *` UTC
  (03:00–03:59 Phnom Penh time). Production only; private constant-time checked
  bearer secret; enable flag; explicit project-ref/HTTPS URL match. Auth/config
  gates precede client construction; HEAD and other methods reject, no caching,
  no request-controlled target/deadlines/scope.
- Worker reuses existing RPCs/helpers: at most 20 expired bills + 20 drafts,
  20 stale uploads and 100 old counter windows, then up to 40 batches of 3 file
  jobs. No early final sweeps. Node maxDuration 300s; soft stop 210s, hard abort
  240s, individual request cap 15s. Storage failure stops further removals;
  interrupted leases and failed jobs remain retryable. Manual CLI behavior is
  preserved. Active-bill QR-orphan retry remains outside this implementation.
- Safe aggregate response/log includes status, counts, remaining due work,
  duration/stopping reason. Failure uses existing Sentry `lifecycle_cleanup`;
  `countsComplete=false` marks uncertain progress. No new notifications or
  missed-run alert service. Vercel does not immediately retry failed cron calls.
- **Validation:** 280 offline tests passed, 8 hosted/provider tests skipped;
  lint and webpack production build passed with source-map uploads disabled.
  Local built-server HTTP checks passed: unauthenticated GET 401, authenticated
  disabled GET 503, HEAD/POST/OPTIONS 405, all no-store. They used a dummy secret,
  disabled worker and placeholder service key. Full-repository formatting and
  diff checks passed. Subsequent hosted probe evidence is recorded below.
- **Hosted preparation confirmed via Chrome:** saved config variables
  `LIFECYCLE_CLEANUP_ENABLED=false` and
  `LIFECYCLE_CLEANUP_PROJECT_REF=uvznqgkbodejvksmtafh`, both **Production only**,
  in Vercel project `nacarees-projects/bill-spiltter-webapp`. Reloaded the list and
  verified both entries. The flag was later enabled after access checks passed.
- **Secret entry complete:** user reported saving `CRON_SECRET` and manually
  redeploying. Chrome verified Secret type and Production-only scope; value was
  not revealed. The manual redeployment `AS8JUv1uSfJXwqzB5r5BvVzL66JZ` rebuilt
  **f4f8b00**, which predates the worker. Public GET/HEAD on the new route still
  returned 404; this does not verify the worker's access gates.
- **Worker published:** committed/pushed on the existing `main` branch at
  `b0ba0ac85209d190fcd65856ed074cbf7a27bfcd`, including prior uncommitted
  inventory/manual-cleanup docs. Commit title: feat: schedule bounded daily
  lifecycle cleanup.
  Vercel deployment `DjzWeacd87N8rWhvWzohfkttTvDj` includes the worker.
  Public Production GET returned **401**, HEAD/POST **405**, all no-store.
  Cron registration was verified: `/api/cron/lifecycle-cleanup`, `0 20 * * *` UTC,
  project Cron Jobs enabled. A dashboard Run while the application flag was false
  returned **503** in Request Logs at `2026-10-22T19:55:31.308Z`, proving the
  authenticated request reached the disabled worker without running cleanup.
- **Activation completed:** user completed Vercel's email verification themselves.
  Agent saved `LIFECYCLE_CLEANUP_ENABLED=true` (Production only) and redeployed the
  verified worker source. Deployment **H8jKFNYNJDkrZnEZN4YWt1bqEnMN**, commit
  **b0ba0ac**, was confirmed **Ready / Production** at **2026-10-23 03:00:28 GMT+7**.
  Public alias: `https://bill-spiltter-webapp.vercel.app/`; immutable URL:
  `https://bill-spiltter-webapp-451pc2qr1-nacarees-projects.vercel.app/`.
  Cron Jobs enabled; exact daily route/schedule reverified after activation.
  Secret values were never revealed, changed or copied by the agent.
- **One enabled probe authorized and successful:** user confirmed “Run one probe
  now” before the dashboard Run action. Runtime log at **2026-10-23 03:02:39 GMT+7**:
  `status=completed`, `stoppedReason=idle`, all removal counts **0**,
  `files={processed:0,failed:0,waiting:0}`, `countsComplete=true`, duration **571ms**.
  One file-batch claim found no due work. Backlog: all eligible counts **0**,
  `pendingFileJobs=13`. This was a manual dashboard probe, not evidence of the
  first time-triggered scheduled invocation. No additional enabled probe ran.
- **Read-only preservation check** at `2026-10-22T20:02:55.045Z`: active bills **19**,
  confirmed receipts **8**, expenses **10**, unchanged; 0 expired bills/drafts,
  stale uploads, old counter windows or due file jobs; 13 pending final sweeps.
- **Next verification:** first time-triggered scheduled invocation remains to be
  observed. The existing 13 final deadlines all pass after Oct 24, **02:30 GMT+7**;
  the enabled daily worker should process them during a later **03:00–03:59** run,
  subject to Vercel delivery, batch/time limits and failures. The user does not
  need to return to trigger cleanup manually. Verify the resulting queue/file
  absence and an active bill's confirmed receipt UI before closing all Stage 4
  checks. Do not bypass deadlines, inject failures, or mark this evidence complete
  merely because the schedule is enabled. Stage 2 remains skipped.
- **Resume guidance:** worker implementation is committed/pushed on existing
  `main`; no new branch or migration. The deployment above is the last directly
  verified code release at its observation time. A documentation-only follow-up
  may trigger another build from identical worker code; check Git/Vercel for the
  latest release identity. README records activation and emergency-stop steps.

## Manual cleanup evidence before automation (2026-10-23)

Status refreshed **2026-10-23 (Asia/Phnom_Penh)**.

- **User-reported complete:** hosted migration
  `supabase/migrations/20261022000000_bill_lifecycle.sql` and the Stage 3 live
  smoke-test checklist. On 2026-10-23 the user said “everything seems to be good”
  after the deployment/creation/retained-receipt/participant/deletion/mobile
  checklist. Treat the smoke checks as passed by user report; exact deployment
  identity and individual test evidence were not independently captured.
  Do not rerun SQL based on historical NOT APPLIED notes or migration-history gaps.
- **Git verified:** checkout is `main` at
  `f4f8b0071c0037df5adaaa75ab01ccd51d7abf23`; its `origin/main` tracking ref and
  earlier feature branch point to the same commit. No further merge is needed
  for this revision. Stage 1's deployed `32355c4` entry is historical.
- **Initial Stage 4 decision:** manual cleanup first, then decide automation.
  The user subsequently requested daily automation; current status is above.
- **Read-only hosted evidence:** lifecycle count-only dry-run at approximately
  **2026-10-23 02:24 GMT+7**, target `uvznqgkbodejvksmtafh`, succeeded:
  **0 expired bills, 5 expired unconfirmed receipt drafts, 3 pending file jobs**.
  Additional metadata-only reads at `2026-10-22T19:24:21.092Z` found **0 upload
  reservations older than 24 hours** and **0 rate-limit windows expired more
  than 24 hours ago**. No customer bill contents or credential values were read
  into the report. The first sandboxed network attempt failed; the same read-only
  command succeeded with network access.
- **Initial file-job timing snapshot:** three jobs, one per bucket, zero due/leased,
  all waiting until approximately **2026-10-24 02:22:07 GMT+7** for their final
  sweeps; highest attempt count is one. Their timing is consistent with an initial
  successful drained pass, but file absence has not been independently checked.
  A nonzero pending count currently does not indicate a failure.
- **First Production apply authorized and completed:** user explicitly approved
  one manual cleanup batch. Fresh dry-run still showed 0 expired bills, 5 expired
  drafts and 3 jobs. At approximately **2026-10-23 02:29 GMT+7**, ran exactly once:
  `npm run lifecycle:cleanup -- --apply --project-ref uvznqgkbodejvksmtafh`.
  Exit 0; result: `bills_removed=0`, `drafts_removed=5`,
  `files={processed:3,failed:0,waiting:3}`. No upload/counter cleanup was run.
- **Post-run read-only verification** at `2026-10-22T19:29:23.103Z`:
  **0 expired bills, 0 expired drafts, 13 pending file jobs**. Active bills **19**,
  confirmed receipts **8**, expenses **10**, all unchanged from the pre-run
  aggregate baseline at `2026-10-22T19:28:59.690Z`. This supports row-count
  preservation; it is not an individual-row or image-availability audit.
- **After the first batch (historical):** 7 jobs due, 6 waiting, 0 leased, highest attempt count 1;
  bucket counts receipt-images 6, payment-qrs 1, image-upload-staging 6. The five
  removed drafts created ten jobs (receipt + staging per draft), so the rise
  from 3 to 13 is expected. Successfully drained jobs remain until their final
  sweeps; the batch's three processed jobs were not removed from the queue yet.
- **Continuation authorized and completed:** the user said “ok lets continue”
  after the plan to process seven due file jobs and later verify final sweeps.
  At approximately **2026-10-23 02:32 GMT+7**, invoked the existing
  `cleanupLifecycleFiles` helper in files-only mode, checking the exact project
  ref and reviewed due-job IDs. Three sequential bounded batches processed
  **3, 3 and 1 jobs**, respectively; every batch had **0 failed**. No bill/draft
  purge RPC was invoked and no further application records were removed.
- **Latest queue/preservation evidence** at `2026-10-22T19:32:33.160Z`:
  **13 pending, 0 due, 13 waiting, 0 leased**. Active bills **19**, confirmed
  receipts **8**, expenses **10**, unchanged before/after every batch. The
  immediately preceding count-only preview found 0 expired bills and 0 drafts.
- **Storage metadata verification** at `2026-10-22T19:32:52.889Z`: the deleted
  bill's **3 bucket folders were empty**; all **10 expired-draft object targets
  were absent**. Each prefix-job parent was confirmed absent from `bills`.
  Used Storage list metadata only: no images, customer bill contents, keys or
  object paths were printed. Active/confirmed UI access still needs verification;
  unchanged aggregate counts alone do not establish individual image availability.
- **Previously recorded manual follow-up:** return after **2026-10-24 02:30 GMT+7** to cover all 13 jobs' final
  sweep deadlines. Original jobs are due around 02:22:07; new jobs around
  02:29:06 (latest `final_sweep_after` is `2026-10-23T19:29:05.859367Z`).
  Refresh read-only job metadata and use the files-only helper in bounded batches
  for this reviewed work, stopping on failures or unexpected scope. Repeat the
  folder/object checks and verify a retained active bill's confirmed receipt
  opens before closing Stage 4. User authorized this continuation; do not ask
  again merely because a new session resumes it. New bill/draft deletion is
  outside this file-only follow-up. No automatic task or reminder is scheduled;
  a resumed agent turn is needed after the deadline. No Production failure
  injection or timestamp edits were performed.
- Stage 2 remains explicitly skipped. No isolated backend is available; broader
  failure/retry cases retain their offline evidence rather than being simulated
  against Production. Scheduling was initially deferred; daily automation is now
  enabled in Production as recorded above.

## Remaining Phase 4 work

The user removed privacy/support content and the Privacy & Help page from the
to-do list. Only mobile/accessibility reviews and operational checks remain.
Stage 2 backup/restore was skipped at the user’s request. Stage 3 is implemented
and committed on `main`; its migration and live smoke checks are user-reported
complete. Stage 4 scheduled/final-sweep verification and broader deployed flows
remain pending. Stage 5 readiness is implemented above; actual rotations remain
separate future actions. Last independently verified worker source was `b0ba0ac`;
this readiness review did not re-audit the current deployment identity.

## Stage 3 implementation (2026-10-22)

Stage 1 is complete. **Stage 2 was explicitly skipped by the user.** Stage 3
lifecycle/deletion code is implemented, tested and committed on `main` at
`f4f8b00`. The user subsequently reported running the hosted lifecycle migration.
Stage 3 hosted smoke checks subsequently passed by user report. Exact Production
deployment identity has not been independently captured; see the resume section.

- SQL: `supabase/migrations/20261022000000_bill_lifecycle.sql`, after rate limiting.
  Adds/backfills `last_activity_at`, renews active bills after qualifying changes
  using 12 UTC calendar months, preserves already-expired/archived status, and
  hardens guarded mutation/upload/extraction functions. It does not purge rows
  when applied. New metadata and RPCs require the coordinated rollout in README.
- Successful participant/expense/payment/QR changes, completed receipt uploads and
  confirmation renew the clock. Reads, failures, retries and processing do not.
  Bills become inaccessible/cleanup-eligible at expiry, without grace or undo.
- Drafts expire at 24 hours; confirmed images now remain until bill deletion.
  Removed the old after-confirmation deletion callback. Receipt links are visible
  on expense cards; missing historical images show an unavailable fallback.
  Private image links are capped by parent/draft/QR deadlines.
- Creator-device deletion requires valid creator session/recovery cookies and
  typing DELETE. SQL checks ownership again under the bill lock, queues file
  removal, deletes dependent app/scoped-quota records atomically, and preserves
  other bills/global/IP quotas. The action clears only bill-scoped cookies and
  redirects to the static deletion-result page.
- Durable private file jobs survive parent deletion, use five-minute leases and
  retry failed work after five minutes. Initial exact-folder sweeps cover all
  three buckets, including orphan/nested objects; a final sweep waits 24 hours
  for late signed uploads. Already issued image URLs may work until expiry if
  physical removal is pending. No periodic worker is configured yet.
- `npm run lifecycle:cleanup` is count-only dry-run. Apply requires
  `-- --apply --project-ref <matching-project-ref>`. At most 20 expired bills,
  20 drafts and three file jobs per call; each job removes up to 100 objects,
  traverses at most ten list pages/eight levels. Repeat for due work and revisit
  after final-sweep times. No Production apply ran during Stage 3 implementation;
  the subsequent approved Stage 4 batch and its results are recorded above.
- Local validation: 243 offline tests pass; eight hosted/provider tests skipped.
  New lifecycle browser checks: 10 pass across Chromium/WebKit desktop, Chromium
  320px, Android and iPhone emulation, with no axe/reflow violations. They use
  mocked actions/static UI, never Supabase. Firefox remains unverified on this Mac.
  Formatting, lint and the webpack build with source-map uploads disabled pass.
  PGlite covers controlled interleavings; live hosted concurrency remains pending.

**Intended rollout order (completion not verified; migration now user-reported run):** use Vercel Authentication All Deployments for a short
maintenance window, verify public/old URLs are gated and bypass traffic stopped,
then wait at least three minutes after the final old request and confirm all
old workers/callbacks drained. User applies SQL; deploy/promote the new candidate
while gated; verify identity/schema/protection before restoring Standard
Protection to reopen only current Production. Keep old generated URLs protected;
do not roll back to image-deleting code. The detailed runbook and official Vercel
reference are in README's lifecycle section. No hosting settings were changed.

Stage 3 migration and live smoke checks are user-reported complete. Stage 4 is
active: the initial Production batch and seven remaining due file jobs completed,
and daily automation is enabled with a successful manual Production probe.
Time-triggered execution, final sweeps and active/confirmed UI verification remain.
Exact deployment identity has not been independently captured.

## Stage 1 inventory (2026-10-22)

Historical observations below retain their original date. The Stage 5 inventory
above supersedes credential status/follow-ups, including the resolved Sentry
revocation report; it does not establish hidden credential-value equality.

Historical audit evidence and original follow-ups are retained below. Stage 2
was subsequently skipped by the user; Stage 3 above is the current work status.

**Status: Stage 1 complete.** The user confirmed the hosted project mapping
and reported keeping everything in Production; no independent backups or
designated test backend were identified. Recovery gaps remain recorded; Stage 2 was subsequently skipped. This inventory supersedes older
handoff claims about deployment settings, shared databases and managed backups.
Chrome inspection and read-only catalog queries were used. No application rows,
image objects or credential values were inspected. No operational changes made.

Observation times below use Asia/Phnom_Penh (UTC+7), on 2026-10-22:
V = 02:49–02:53 (Vercel); S = 02:54–02:58 (Supabase/catalogs);
L = 02:48–02:58 (local repository and presence-only environment checks).
U = 02:59 (user confirmation in this conversation, received 19:59 UTC Oct 21).
Statuses describe the evidence, not an assertion that a configuration is ideal.

### Deployment identity

| Finding                                                                                                                                                                                                                                | Status    | Evidence / observation                                                                                                                                                                                                                                               | Next action / owner                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production is Ready/current on `main`, commit `32355c4ab85630e9ac5a18475a846a849d8bbd0d`; deployed Oct 21, 01:41:43 GMT+7                                                                                                              | Confirmed | V: [deployment details](https://vercel.com/nacarees-projects/bill-spiltter-webapp/BSwrfSxw3pgZvudZ6gsowSs4vGEQ)                                                                                                                                                      | Agent: use this release as the baseline; deployment of local changes is a later step.                                                                                                     |
| Production URL: `https://bill-spiltter-webapp.vercel.app/`; immutable URL: `https://bill-spiltter-webapp-87e8ovlpj-nacarees-projects.vercel.app/`; branch alias: `https://bill-spiltter-webapp-git-main-nacarees-projects.vercel.app/` | Confirmed | V: deployment Domains panel                                                                                                                                                                                                                                          | Agent: use immutable URL when identifying the audited release.                                                                                                                            |
| Latest retained Preview URL/commit/status                                                                                                                                                                                              | Missing   | V: [Preview deployment filter](https://vercel.com/nacarees-projects/bill-spiltter-webapp/deployments?environment=preview) returned No Results; overview had No Active Branches. Project retention is 30 days, so this does not establish that Preview never existed. | Agent: record a future Preview's identity when one is explicitly deployed.                                                                                                                |
| Local checkout is `main` at the same full commit; mobile/accessibility changes are uncommitted and undeployed                                                                                                                          | Confirmed | L: `git log -1`, `git status --short`; mobile section below                                                                                                                                                                                                          | Preserve pending work. Agent: include it only in a later requested deployment.                                                                                                            |
| Vercel framework Next.js; build/install/output overrides off; root default `./`; repository build script `next build`                                                                                                                  | Confirmed | V: [Build and Deployment](https://vercel.com/nacarees-projects/bill-spiltter-webapp/settings/build-and-deployment); L: `package.json`                                                                                                                                | Agent: reconcile README's `npm ci` / webpack override instructions with observed settings in a later documentation task. Historical build internals were not independently reconstructed. |
| Vercel Node `24.x`; local Node `24.22.0`; CI Node `22`                                                                                                                                                                                 | Confirmed | V: project and deployment runtime settings; L: `node --version`, `.github/workflows/ci.yml`; README recommends Node 22                                                                                                                                               | Agent/user: choose and align a supported version in a later stage; no setting changed.                                                                                                    |
| Vercel team Hobby; Fluid Compute enabled, function region `sin1`, standard 1 vCPU / 2 GB; Standard deployment protection                                                                                                               | Confirmed | V: project/deployment settings                                                                                                                                                                                                                                       | Agent: retain as operating context.                                                                                                                                                       |

### Environment mapping and variable inventory

| Finding                                                                                                                                         | Status                            | Evidence / observation                                                                                                                                                                                                  | Next action / owner                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local uses `https://uvznqgkbodejvksmtafh.supabase.co`                                                                                           | Confirmed                         | L: `.env.local`, public URL only; S: matching project overview URL                                                                                                                                                      | Agent: treat local live checks as using this hosted backend, not an isolated database.                                                                    |
| Hosted project inspected: `bill-spilter`, ref `uvznqgkbodejvksmtafh`, Orange Whiskers, Singapore `ap-southeast-1`, Nano, PostgreSQL `17.6`      | Confirmed                         | S: [project overview](https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh), `current_setting('server_version')`; no Supabase branches shown                                                                     | Agent: schema/backup findings below apply to this project.                                                                                                |
| Production and Preview share one configured `NEXT_PUBLIC_SUPABASE_URL` entry; no branch-specific override was shown; no linked shared variables | Confirmed                         | V: [project variables](https://vercel.com/nacarees-projects/bill-spiltter-webapp/settings/environment-variables), URL entry metadata and Shared tab. Both scopes selected, Custom Preview Branch unselected.            | Agent: regard ordinary Preview as sharing the configured Production target unless explicitly isolated later.                                              |
| Production and Preview are configured for `uvznqgkbodejvksmtafh`, the same project as Local                                                     | Confirmed — user-reported mapping | U: user answered “yes it is” to the explicit Production/Preview project-ref question; V: both scopes share one saved URL entry. Write-only values and the deployed baked configuration were not independently revealed. | Agent: treat all three as sharing Production data/quota. Hidden credential consistency remains unverified and is reserved for later validation.           |
| Hidden anon/service/session/rate/Gemini/Sentry value consistency, validity and rotation state                                                   | Unverified                        | V/L: presence and scope checks only; no values compared or credentials exercised                                                                                                                                        | Stage 5 supersedes this historical status: Sentry revocation/replacement resolved by user confirmation. Other hidden-value/live checks remain unverified. |

Variable evidence: V project-variable list (eight entries), L `.env.local`,
`.env.sentry-build-plugin`, `src/env.js`, `next.config.mjs`, Sentry configuration.
All observations use V/L times above. “Present” means nonempty only, not valid.
No Development-scoped entries were listed in Vercel.

| Variable name                              | Local presence                                                          | Production scope   | Preview scope      | Status / next action and owner                                                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                 | Present                                                                 | Present            | Present            | Confirmed presence (V/L) and project mapping (U, user-reported); agent: use a different project ref for isolation later.                                                                                                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`            | Present                                                                 | Present            | Present            | Confirmed presence; agent: verify pairing later without disclosing values.                                                                                                                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`                | Present                                                                 | Present            | Present            | Confirmed presence; required for server data operations. Agent: verify later.                                                                                                                                                                     |
| `PARTICIPANT_SESSION_SECRET`               | Present                                                                 | Present            | Present            | Confirmed presence; required session-signing key. Agent: rotation rehearsal later.                                                                                                                                                                |
| `RATE_LIMIT_SECRET`                        | Present                                                                 | Present            | **Absent**         | **Missing in Preview.** `src/env.js` and limiter code allow reads but fail writes closed without a valid key. User/agent: correct scope at the authorized configuration stage before Preview write tests; shared-backend limiter keys must agree. |
| `GEMINI_API_KEY`                           | Present                                                                 | Present            | Present            | Confirmed presence; needed for real extraction. Agent: real-provider verification later.                                                                                                                                                          |
| `GEMINI_RECEIPT_MODEL`                     | Present                                                                 | Present            | Present            | Confirmed optional model override; agent: retain for later verification.                                                                                                                                                                          |
| `SENTRY_AUTH_TOKEN`                        | Present in ignored `.env.sentry-build-plugin`, absent from `.env.local` | Present            | Present            | Confirmed presence; `next.config.mjs` requires it for Vercel builds. Agent: rotation/source-map checks later.                                                                                                                                     |
| `PARTICIPANT_SESSION_PREVIOUS_SECRET`      | Absent                                                                  | Absent             | Absent             | Confirmed optional fallback absent; agent: exercise during isolated rotation rehearsal.                                                                                                                                                           |
| `RECEIPT_EXTRACTION_DEV_FIXTURE`           | Absent                                                                  | Absent             | Absent             | Confirmed optional fixture absent; agent: keep real deployment verification free of fixtures.                                                                                                                                                     |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_RELEASE` | No local override                                                       | No listed override | No listed override | Confirmed optional overrides absent; repository supplies DSN/default release behavior. Agent: no action for Stage 1.                                                                                                                              |

### Hosted schema and storage

**Confirmed compatibility** (S): all 11 sorted SQL files in
`supabase/migrations/` were loaded into a temporary in-memory PGlite database
without application fixtures. Read-only hosted catalog SELECTs compared sorted
metadata fingerprints against that expected schema. No application/cleanup RPC
was invoked. SQL Editor location:
`https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh/sql`
(private query workspace `73847e31-c1fe-4613-aa90-42773acadcee`; query text/results
may not persist after navigation). Evidence includes the following observed
counts and matching reference fingerprints; MD5 is used for drift comparison,
not credential handling or a security guarantee.

| Catalog comparison                                                                                                                                                                            | Objects | Matching reference fingerprint     | Status / next action and owner                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Columns: table/column names, types, nullability and defaults (`pg_attribute`, `pg_attrdef`)                                                                                                   | 142     | `4d3d20b4b36ef205105d320daf868753` | Confirmed; agent: no migration indicated by this comparison.                                                                                    |
| PK/FK/unique/check constraints (`pg_constraint`, excluding `contype='n'`)                                                                                                                     | 105     | `3249dc9808c99b16bb8449d5e8ed4140` | Confirmed; agent: no action. PGlite PostgreSQL 18 adds 110 NOT NULL catalog rows absent on hosted 17; nullability was separately matched above. |
| Index definitions (`pg_indexes`)                                                                                                                                                              | 40      | `c9cf61bed3cfdfed540e8ee12883635e` | Confirmed; agent: no action.                                                                                                                    |
| Noninternal trigger definitions (`pg_trigger`)                                                                                                                                                | 7       | `4e482f185b59655c927deef4671f3e0f` | Confirmed; agent: no action.                                                                                                                    |
| Function identities/results, whitespace-normalized bodies, security-definer/volatility/search-path configuration and effective anon/authenticated/service-role EXECUTE privileges (`pg_proc`) | 25      | `7f024dc8920eee1ae38f3d9f8a0d2a75` | Confirmed; agent: no action. Includes v3 rate-limited extraction and retired legacy execute access.                                             |

| Finding                                                                                                                                                           | Status                              | Evidence / observation                                                                                                      | Next action / owner                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| All 13 expected public application tables exist with RLS enabled; anon/authenticated have no SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER table grants | Confirmed                           | S: `pg_class`, `has_table_privilege`; tables listed below                                                                   | Agent: preserve service-mediated access during restore rehearsal.                                                      |
| Zero policies in `public` or `storage`; `storage.objects` has RLS enabled                                                                                         | Confirmed                           | S: `pg_policies`, `pg_class`; matches expected service-only access                                                          | Agent: verify private signed-file behavior during isolated recovery, without opening customer files now.               |
| Migration history lists only six versions, `20260815110000` through `20260816011000`; five later migration IDs are absent despite matching actual schema          | Confirmed                           | S: `supabase_migrations.schema_migrations`; L: 11 migration files                                                           | User/agent: do not reapply SQL based only on missing history; reconcile history separately if adopting CLI migrations. |
| Project health                                                                                                                                                    | Confirmed point-in-time observation | S: overview initially displayed Unhealthy during loading, then Healthy on revisit at 02:57–02:58; catalog queries succeeded | Agent: this is not an uptime guarantee; recheck before Stage 2.                                                        |

Expected tables: `bills`, `bill_participants`, `activity_log`, `expenses`,
`expense_shares`, `receipt_scans`, `receipt_items`, `receipt_item_assignments`,
`settlements`, `bill_payment_methods`, `image_upload_reservations`,
`rate_limit_policies`, `rate_limit_counters`.

Bucket settings are **confirmed** from `storage.buckets` metadata SELECTs (S).
No bucket objects, filenames or image contents were read.

| Bucket                 | Public | File-size limit  | Allowed MIME types                                    | Next action / owner                                                                           |
| ---------------------- | ------ | ---------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `receipt-images`       | false  | 10,485,760 bytes | `image/jpeg`, `image/png`, `image/heic`, `image/heif` | Agent: include private receipt bytes in Stage 2 backup design.                                |
| `image-upload-staging` | false  | 10,485,760 bytes | `image/jpeg`, `image/png`, `image/heic`, `image/heif` | Agent/user: decide whether transient staging is restored or deliberately excluded in Stage 2. |
| `payment-qrs`          | false  | 2,097,152 bytes  | `image/png`                                           | Agent: include private QR bytes in Stage 2 backup design.                                     |

### Recovery coverage and isolated destination

| Finding                                                                                                                                                                | Status                                                           | Evidence / observation                                                                                                                                                                                                                                                                                                               | Next action / owner                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization is Free; scheduled project backups are unavailable; latest successful managed backup and retained restore points: none available                          | Missing coverage, confirmed plan limitation                      | S: [Scheduled backups](https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh/database/backups/scheduled) says Free Plan does not include project backups; overview says No backups                                                                                                                                             | User/agent: choose manual protected exports or an appropriate paid backup plan in Stage 2; no upgrade/export performed.                                        |
| PITR is unavailable on current plan; requires Pro plus add-on. Restore-to-new-project is unavailable; requires Pro or above and physical backups                       | Missing on current plan                                          | S: [PITR](https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh/database/backups/pitr), [restore-to-new-project](https://supabase.com/dashboard/project/uvznqgkbodejvksmtafh/database/backups/restore-to-new-project)                                                                                                          | User/agent: select recovery method later; dashboard upgrade text is not enabled coverage.                                                                      |
| Current-plan recovery route is a manually created logical export restored to a separate compatible database; no export or restore was tested                           | Confirmed available documented method; recoverability unverified | S: [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), checked 02:57; L: Supabase CLI, Docker, psql and pg_dump not on PATH                                                       | Agent: prepare tooling and protected export/restore runbook in Stage 2; user supplies existing connection access securely when needed. No password reset now.  |
| Independent database exports / off-site backup process, latest successful backup, retention and protected location                                                     | Missing — no independent coverage identified                     | U: in response to the backup/test-target question, user said “i put everything in hte prod database”. No external export process/location was supplied; L: none found in repository. This is owner-reported coverage, not an audit of external accounts.                                                                             | Agent/user: establish protected database exports or managed backup coverage in Stage 2, with explicit retention and successful-backup evidence.                |
| Independent receipt/QR file backup process and protected backup location                                                                                               | Missing — no independent coverage identified                     | U: user reports everything kept in Production, with no separate file-backup process/location supplied; L: no repository workflow found. S: [database backups exclude Storage file bytes](https://supabase.com/docs/guides/platform/backups), checked 02:57. The database stores object metadata; private file bytes live in Storage. | Agent/user: include receipt and QR bytes in the Stage 2 recovery design and verify protected copies separately from the database.                              |
| Existing designated isolated Bill Splitter test backend                                                                                                                | Missing — none identified                                        | U: user reports everything in Production; S: current project has no branches. Other organization projects have unrelated names and were not inspected/reused; designation was not inferred from names.                                                                                                                               | Agent/user: proceed with the dedicated project proposal below when provisioning is explicitly reached.                                                         |
| Proposed destination: new dedicated `bill-splitter-ops-test`, with its own Supabase ref/database/buckets and test credentials, separately scoped Preview configuration | Confirmed proposal; not provisioned                              | S/U: no isolated Bill Splitter target identified; current Local/Preview/Production share the Production backend.                                                                                                                                                                                                                     | Agent/user: provision only in a later explicit step, resolve the account limit below, then verify backend separation before synthetic recovery/lifecycle work. |
| Creating another free project in Orange Whiskers is currently blocked: Nacaree has reached the active free-project limit of 2                                          | Confirmed prerequisite                                           | S: [New project form](https://supabase.com/dashboard/new/wbbtmnbcoeigvylejwup) displayed limit warning and disabled Create; no form submitted                                                                                                                                                                                        | User: choose an existing designated isolated target, arrange a paid project, or separately decide how to free a slot. No project was paused/deleted/upgraded.  |

### Acceptance and change boundary

**Stage 1 acceptance is complete.** Deployment identity, the shared backend
mapping (user-confirmed), direct schema compatibility, storage configuration,
missing independent recovery coverage and the proposed isolated test destination
with its account prerequisite are established. Unknown hidden credential values
remain explicitly unverified, as allowed by the inventory scope. Missing backups
and the test-project slot are Stage 2 prerequisites, not remaining inventory
questions. No recoverability or restore success is claimed.

Subsequent user decision: skip Stage 2. No backup/recovery or test-project
provisioning work is currently requested. Follow Stage 3 above and then Stage 4;
the audit's original Stage 2 next-action cells are historical context only.

Only `HANDOFF.md` and `CURRENT_WORK.md` were edited during this inventory.
Preexisting mobile/accessibility source, tests, package files and README changes
were preserved. Read-only queries inspected catalog/configuration metadata;
the SQL Editor may retain a private query snippet automatically. No deployment,
migration, app mutation/RPC, cleanup, restore, backup download, credential change,
test-data creation or test-project provisioning was performed. Documentation
formatting, diff checks and a before/after file-hash comparison validate scope;
application tests were not rerun for these documentation-only edits.

## Operational verification plan (2026-10-22)

This is the execution order: Stage 1 complete, Stage 2 skipped by user,
Stage 3 committed on `main` with migration and live smoke checks user-reported
complete; Stage 4 daily automation is enabled with a successful manual probe and
scheduled/final-sweep verification pending; Stages 5–7 remain pending. Work proceeds one stage at a time, with observed
results and unresolved decisions recorded here
and a concise status in CURRENT_WORK. Hosted migrations remain user-applied.

1. **Read-only baseline.** Record the deployed release, local pending changes,
   Preview/Production database targets, migration/schema compatibility, private
   buckets, secret names/scopes (never values), and available backup facilities.
   The user confirms Local/Preview/Production use `uvznqgkbodejvksmtafh`;
   current Vercel scopes share one configured URL entry. A Preview hostname alone does not isolate backend
   changes. Identify a separate test backend/local restore destination before
   lifecycle or rotation rehearsals.
   Done: an inventory with confirmed/unknown items and a chosen test target.
2. **Recovery rehearsal — skipped by user; historical outline only.** Confirm backup coverage, retention and acceptable data
   loss/recovery time. Database backups exclude Storage file contents:
   https://supabase.com/docs/guides/platform/backups
   Define a separate private-file backup method and protected backup location.
   Rehearse synthetic bill data plus receipt/QR file recovery on an isolated
   destination; compare counts, financial balances, file access and permissions.
   Document the actual hosted recovery method supported by the user's plan.
   Done: verified recovery evidence and repeatable steps, not just a saved dump.
3. **Lifecycle rules — implemented locally.** Twelve months of inactivity,
   24-hour drafts, confirmed images until bill deletion, immediate cleanup
   eligibility at expiry and permanent creator-device deletion were agreed.
   See Stage 3 above and README for code, tests, migration and coordinated rollout.
   Hosted SQL application and deployment remain user-controlled later actions.
4. **Cleanup rehearsal and routine.** Test expired staging reservations, rejected
   uploads, abandoned receipt drafts, replaced/removed QR files and old counters.
   Verify bounded batches, valid-data preservation, failure recovery and repeat
   runs. Test the operator commands on an isolated backend first. Decide/document
   the idle-time routine. Daily Vercel scheduling is now enabled and manually probed;
   first time-triggered invocation and final-sweep verification remain pending.
   Done: demonstrated cleanup and an explicit manual or scheduled operating plan.
5. **Credential readiness — implemented 2026-10-23.** Seven runbooks and offline
   disposable-key rehearsals cover Supabase public/server, Gemini, session,
   rate-limit, Sentry and cron credentials. See the Stage 5 inventory above;
   hidden-value/live acceptance checks remain unverified. Sentry revocation and
   replacement are resolved by user report. Preview limiter configuration is
   still missing. Actual hosted rotations are separate future operator actions.
6. **Deployed verification.** Deploy the intended candidate when requested, then
   use fresh synthetic bills on that hostname. Check create/share/join, expenses,
   receipt review/confirmation, QR access and payment records. Use one generated
   receipt for the real-provider path; record scan usage. Scope a controlled
   rate-limit denial to synthetic bill/participant identities, preserving shared
   policies/global quota. Verify retained input, retry timing and monitoring of
   unexpected failures. Missing-secret/store-outage tests use an isolated backend.
   Done: normal and blocked flows pass on the intended deployment; fixtures gone.
7. **Closeout.** Record each check, expected/observed result, evidence and any
   remaining action. Keep recovery, cleanup, rotation and deployment/rollback
   instructions concise and reproducible. Finish the outstanding real-device,
   screen-reader and Firefox checks before declaring Phase 4 complete.

The agent prepares code, tests, scripts, SQL and runbooks. The user confirms
hosting/account settings and applies hosted migrations; provisioning a test
project, deploying, restoring or changing production credentials is handled as
an explicit concrete step when reached. No operational changes were made while
preparing this plan.

## Mobile and accessibility (2026-10-22)

Local code adds responsive native controls/long-name wrapping (including a
WebKit native-option overflow and undersized dropdown fixes), consistent focus
outlines, a focusable skip target, larger disclosure/receipt/checkbox targets,
16px touch-input text and reduced-motion support. Receipt pages have their own
title. Form errors are associated with fields/groups; rejected entries survive
React action resets and focus moves to the first invalid field or form error.
Receipt add/remove keeps focus, and saving an expense editor returns it to Edit.
QR action errors now live inside their forms so they receive focus. File errors
focus their picker. Link copying announces success and provides a selected URL
field if clipboard access fails. No migrations or deployment changes are needed.

New axe/Playwright suite: `npm run test:e2e:a11y` for home/invalid-link checks;
`npm run test:e2e:a11y:live` explicitly creates/cleans synthetic bill/draft rows
and tests expense/payment/receipt controls. It seeds ready receipts directly,
never calls Gemini, never consumes scan quota, creates no storage files and
never initiates bank payments. Normal UI write quotas still apply. Install
Chromium/Firefox/WebKit with `npx playwright install chromium firefox webkit`.
The matrix covers desktop engines, 320px Chromium, Android and iPhone emulation.
See the current clarification above for verified results and README for the
remaining manual checks. Firefox headless could not launch on this
Mac (sandbox/compositor failures), so that engine remains unverified.
For local build checks, `SENTRY_AUTH_TOKEN='' npm run build -- --webpack` skips
external source-map uploads; the configured deployment workflow is unchanged.
At this section's original 2026-10-22 observation, these changes were not deployed;
Stage 6 subsequently verified Production at `eec047e`, which includes them.

## Rate limiting (2026-10-21)

Commit 32355c4 was confirmed deployed on Vercel. Do not apply hosted migrations for the
user. SQL: `supabase/migrations/20261021000000_rate_limiting.sql`, after direct
uploads. Pause extraction, wait for workers, apply SQL, deploy updated code, then
resume: service-role access to claim_receipt_extraction_v2 is retired. The new v3
claim atomically charges quota and assigns attempts; stale-worker guards remain.

Private database policies/counters enforce the agreed generous limits; README
lists them. All actions first enforce 300/minute/IP. Authorized operation limits
precede mutation/token issuance/processing. Extraction is capped at 100/day across
all deployments sharing this project, resetting 00:00 UTC, including failed
attempts/retries. Duplicate claims do not spend extraction quota. Quota denial
retains images, stores next_retry_at, and offers manual entry. Claims use the
acting participant propagated from authorized completion/retry.

Set RATE_LIMIT_SECRET (32+ characters) in local .env.local and both Vercel scopes;
keep it identical across deployments using this database. No .env.local was edited.
Vercel-only trusted IP header, normalized HMAC subjects; local fixed identity.
Missing secret/migration/store errors fail closed; reads are not guarded.
Five-second limiter network deadline. Expected denials preserve response shapes,
inputs and upload reservations; no automatic mutation retries. Static limiter
failure reporting goes to Sentry without identifiers.

Cleanup deletes 100 windows older than expiration plus 24 hours per call. For idle
projects: npm run rate-limits:cleanup until zero. No scheduler added.
Opt-in hosted check: npm run test:integration:rate-limits AFTER migration; synthetic
concurrency checks, no Gemini, consumes one global attempt and cleans test records.
The user reports the migration/secret setup is complete and supplied passing
output for both hosted concurrency tests (2/2). The deployed release was later
confirmed, and a recent receipt processed and was confirmed successfully.
A controlled deployed rate-limit denial remains part of operational validation.
See CURRENT_WORK for final validation.

## Sentry setup (2026-10-20)

The user reports all required migrations, Vercel deployment and live bill flows
are working. Phase 4 has started with Sentry; SDK setup is documented below.
Production receipt errors and traces were observed in Sentry. No Sentry migration
is required.

The Codex plugin is connected, and the application now uses `@sentry/nextjs`
11.8.0. Project: `nathan-d2 / bill-splitter-webapp`, team `nathan`, US region.
Browser/Node/Edge initialization, Next request hooks, both error boundaries,
manual server-action instrumentation and handled unexpected failures are wired.
Action arguments/responses are excluded. Traces sample at 100% development and
10% production builds. Shared links/private paths and payloads are filtered;
unknown error messages become generic/static operation labels. Source frames
remain available. Replay/profiling are not configured; breadcrumbs/logs/metrics
are dropped. Platform logs have separate privacy/access considerations.

Local development errors/traces and a compiled production error were verified
through Sentry MCP. Production issue:
https://nathan-d2.sentry.io/issues/BILL-SPLITTER-WEBAPP-3
The stack maps back to original source with context. Synthetic email/receipt/tag
canaries were absent. Public browser source maps were deleted after upload.
Temporary verification routes were removed. Synthetic issues remain unresolved;
offer cleanup before resolving them. Check CURRENT_WORK for final check results.

The replacement organization auth token is saved in ignored root file
`.env.sentry-build-plugin`, loaded by Next config for build uploads. Never read
its value into chat/output. A prior token was accidentally put into a browser
search during clipboard automation; the user was notified and a newer token is
configured. Revocation of the exposed old token is not confirmed. Avoid clipboard
browser navigation while secrets may be copied.

Set `SENTRY_AUTH_TOKEN` in Vercel Preview and Production before deploying these
changes; builds fail on Vercel if missing. Vercel environment/Git SHA identify
events and releases. Local builds without a token skip source-map uploads.
Commit/push/deploy only when requested. Remaining Phase 4 work is listed above:
mobile/accessibility review and operational checks.

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

## Required hosted migrations — user reports applied

`supabase/migrations/20261017000000_phase_3_settlements.sql`

The user reports the migrations and live flow are complete. For a fresh project,
apply this complete file once through SQL Editor; it includes BEGIN/COMMIT.
It adds settlement/payment-method schema, RPCs, permissions and private storage,
preserving existing expenses. Automated hosted verification was not run here.
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

1. Read CURRENT_WORK for the latest validation and current task.
2. Finish real-device, screen-reader and Firefox accessibility verification.
3. Complete remaining operational checks (Stage 2 backup/restore skipped): migrations, key rotation,
   expiration, cleanup, permanent deletion and deployed-flow verification.
