# Bill Splitter — Computer Handoff

Read this file and `CURRENT_WORK.md` when resuming.
Current branch: `main`; use `git log -1` for the latest saved commit. The earlier
`work/mobile-accessibility-lifecycle` branch is historical; do not assume it
matches current `main`. Phase 3 implementation is included in this checkout.
Check out/pull `main` and run `npm ci` when moving to another computer.
The user wants migration SQL saved in `supabase/migrations/` and will apply
hosted migrations themselves. Tell them when a new migration is required.

## Latest local UI work — Oct 31

- `/screen2` now uses the approved balance motion. It remains a session-local
  prototype; keep the existing main-app create-bill form. Next work is drawer/form
  polish, then integration with the real bill actions and validation.
- Balance amount tracking is -0.045em (loosened from -0.055em). Shared
  `AnimatedMoney` uses `@number-flow/react` 0.6.2 and a 1100ms transition with
  cubic-bezier(0.4, 0, 0.2, 1), from `balanceChangeTiming`. NumberFlow handles
  digit rolling, interrupted changes, currency formatting and accessible labels.
  The amount displays the absolute balance; owed/owe/settled labels follow its sign.
- Shared `DesignBalanceContours` replaces the old two pseudo-element rings:
  eight arcs on the right, three lower-left and three upper-left. All 14 lines
  share one 9-second drift. Right-side arcs use 24-unit spacing (radii 142–310),
  1px strokes, 0.16–0.06 opacity and -25° SVG rotation, giving a clean downward-right
  lean. The user's black drawing specified direction; keep concentric curves.
  Corner clusters are smaller/fainter. The last addition is the upper-left outer
  arc at radius 153, opacity 0.035. Each cluster has its own fading mask.
- Shared `DesignBalanceGlow` uses blue #266be8 and secondary #388dff at 0.35–0.55
  layer opacity. It drifts from (8%, -6%) to (-14%, 12%) on a 24-second loop.
  Saturated blue replaced pale lavender/mint tints that the user could not see.
- A mounted, visible balance change briefly lifts only the glow's brightness
  (1 → 1.18 → 1), sharing the 1100ms digit timing. Repeated changes merge from
  the current brightness. Mounting/route returns do not replay old changes.
  Pause, hidden/offscreen state, reduced motion and unmount cancel the reaction.
- The existing shimmer remains: 1.8s sweep every 12s, 14% strength and 12px blur
  on purple. Contours/glow reuse its visibility state: run only when at least
  half the card is visible and the tab is foregrounded, with no extra timer.
  Reduced motion keeps backgrounds still; forced colors hide decorative layers.
  Phone cards retain the 190px minimum height, 16px padding and 48px action target.
- `/design-system#balance-background` compares the previous two arcs against the
  applied design, over the same glow/shimmer. Fast mode uses 1.5s contour and 4s
  glow loops; Use natural speed matches Screen 2 (9s / 24s). Replay/pause and
  expense/payment/reset controls work locally. `/design-system#balance-motion`
  has the shared NumberFlow demo. `balance-rings.module.css` supports only the
  previous-design comparison. Do not restore the old two rings on Screen 2.
- New files: `src/components/ui/animated-money.*`; design-system
  `balance-{background-preview,contours,glow,motion-preview}` JSX/CSS plus
  `balance-rings.module.css`; `tests/components/balance-glow.test.jsx`.
  Package and lockfile include NumberFlow; run `npm ci` on another computer.
- Validation: 363 offline tests pass, 8 hosted/provider tests skipped. Six new
  component tests cover reaction lifecycle and cancellation. Local Chromium/
  WebKit checks cover final 8/3/3 counts, tilt, 9s timing, fixed text/card sizes,
  real offscreen/hidden pausing, reduced motion, forced colors, glow reactions,
  navigation, 320/393px bounds and axe. Screenshots reviewed; lint, formatting,
  diff checks and production build pass. Browser checks were local scripts,
  not newly persisted Playwright specs. No backend calls or new migrations.
- Hosted cleanup, deployment and provider incident status were not refreshed in
  this UI pass. Retain the operational fixture until the overdue follow-up below
  is completed; do not treat old hosted evidence as current state.

## Previous local UI work — Oct 29

- Saved commit `badc3aa` contains the Oct 29 Screen 2 polish and real activity
  timestamps. The Oct 31 motion work above builds on that baseline.
- Prior baseline commit `b4d160d` added `/screens` and `/screen2` prototypes plus
  shared Animate UI button feedback. `795e759` adds saved receipt editing;
  its `20261028000000_edit_saved_receipts.sql` migration must be applied before
  deploying that feature. Hosted application has not been verified here.
- User chose to keep the existing working create-bill form. Polish `/screen2`
  section-by-section, then integrate existing bill actions and validation.
- Local follow-up adds the exact design-reference 1.8s shimmer to the purple
  balance card, extracted into shared `DesignShimmer` with the original styling.
  The card now repeats every 12s: a 1.8s sweep plus 10.2s rest (15% moving).
  Replays run only while at least half the card is in view and the tab is visible;
  returning starts a fresh cycle. Hover/touch/focus do not add extra sweeps.
  Reduced motion uses a still highlight and stops the timer. Reference replay
  checks still pass. Purple-card
  follow-up sets shimmer strength to 14% with 12px beam blur via surface-level
  CSS variables; the pale-glass reference keeps its original intensity. Visually
  reviewed at mid-sweep in Chromium/WebKit. Clock-controlled browser checks
  verify 12s cadence, no interaction replays, offscreen/background pause and
  resumption, and reduced-motion timer cleanup. Lint/format/build pass.
- Main overview and shared shell now use Helvetica, Bold 700 headings, semantic
  colour tokens, 32px cards, 22px controls, 28px panels, 18px rows, 48px minimum
  controls and the shared blur/motion timing. Phone layouts (up to 600px) use
  16px gutters and 16px balance-card padding. User supplied a wide card size
  reference: target proportions are 1.9:1, using container-relative minimum
  height with a 190px floor so content can grow on narrow/zoomed layouts. At
  393px the card is 361×190px, with a 48px amount and 48px action. Desktop uses
  the panel gutter/padding and a 60px amount. Section headings keep roughly 28px above
  and 12px below; 48px action hit targets use those margins without inflating
  the heading row. Verified at 320/390/1280px in Chromium and WebKit.
  Overview copy now uses one direct balance label (owed/owe/settled), no pill
  or dot; the expense count has no leading zero. Recent activity has one heading;
  See all uses the shared Animate UI ArrowRight button. Decorative gradients,
  avatars and individual type sizes remain purpose-specific. Drawers/forms are not fully standardized.
- User approved a simpler expense-list direction. `/screen2` overview and
  Expenses now share compact ~74px rows without the rounded outer container or
  coloured category tiles. Neutral 20px Animate UI coffee/route/shopping-bag/tag
  icons replace text glyphs; original library animations play on row hover/focus,
  respecting reduced motion. Quiet separators, 15px names/amounts and readable
  secondary payer/receipt/share text preserve the information hierarchy. Hover
  changes the name colour without filling the row. Icon provenance is recorded
  in the design-system icons README. Existing amounts and navigation remain.
  Chromium/WebKit checks at 320/393/1280px pass: row layout, axe, focus, opening
  expenses, search and reduced-motion operation. Lint/format/build also pass.
- Recent activity uses individual white cards with soft borders, a faint shadow,
  22px corners and 8px gaps. The user preferred these compact corners over the
  32px card radius and requested the same 22px rounding on the people summary.
  Both use `--ds-control-radius` by that explicit choice. Each card has the person's existing 34px avatar,
  a semibold name, an action underneath and a quiet timestamp in its own right
  column, vertically centered with the full entry and consistently inset 19px
  from the card edge (including border).
  The section stays 16px after the expense list. No timeline dots or extra labels.
  Local preview events now store actor ID + action separately, avoiding name
  parsing and duplicate names in the display; payment events preserve the payer
  as actor. Initial/reset entries live in `example-ledger.js`.
  Chromium/WebKit at 320/393/1280px pass: layout, new person events, correct actor
  attribution for name prefixes, long text, axe, reset and console. Lint/format/
  build pass. No hosted state changed.
- Activity timestamps are implemented on `/screen2`. Events store UTC ISO
  `createdAt`; successful local actions capture their actual creation time and
  preserve actor attribution. Opening/reset seeds synthetic history once from
  the browser clock (5 minutes ago, 2 hours ago, yesterday at local midnight).
  History remains session-local; the main app's database activity is unchanged.
- Reusable `ActivityTime` renders a transparent 48px timestamp trigger with a
  semantic `time` element. One shared visible-tab clock updates every 60 seconds,
  stops while hidden/unused and resyncs on return/local writes/resets. SSR and
  initial hydration render a stable placeholder. Formatting uses the visitor's
  calendar/timezone: Just now, minutes/hours today, Yesterday, then date/year.
  Future values clamp to Just now; invalid values are noninteractive placeholders.
- Tap/click/Enter/Space opens a Radix popover with exact local date/time/timezone;
  Escape/outside/repeat activation closes it and restores keyboard focus. No
  hover fill or automatic live announcements. Cards retain 22px corners and
  vertically centered right-edge alignment. Phone screenshots reviewed.
- Timestamp validation: 357 offline tests pass, 8 hosted/provider tests skipped;
  9 browser checks pass across Chromium, WebKit and iPhone emulation. Covers
  DST/timezones/midnight, shared timer lifecycle, hydration, exact-time disclosure,
  a between-ticks reset regression, new events, axe and 320px bounds. Lint,
  repository formatting, diff checks and production build pass. No migration,
  hosted write, provider call, dependency change or deployment.
- Share bill is aligned in the title row with a 16px gap. The copied-state icon
  and label remain functional; the icon is 15px with a 5px label gap. Section and
  people-card arrows are 14px with a 1.5px stroke; See all has no hover fill.
- `/design-system#forms` now previews three user-requested formats: an expense
  form, a quick add-person form and a compact removal confirmation. The first
  two use bottom drawers on phones and centered panels on desktop; confirmation
  stays centered. Shared fields/calendar/person picker/checks/buttons, local
  equal-split previews, validation, retained drafts and scrollable form bodies
  with visible action footers are included. All data/actions remain local samples;
  these formats have not yet been applied to `/screen2` drawers.
- Preview checks pass on desktop/phone Chromium and 320px WebKit: axe, nested
  picker/calendar interactions, error focus, draft preservation, focus return,
  sample actions, reduced motion and a short 480px viewport. No backend requests.
- Local Chromium checks at 320/375/768/1280px and WebKit at 320/390px pass:
  computed tokens (including responsive phone spacing), live token propagation,
  no horizontal overflow, control sizes,
  focus, axe and settler navigation. Screenshots reviewed; lint/format/build pass.
  No hosted write, migration or deployment in this follow-up.

## Next chat — UI polish and feature cleanup

Continue the requested `/screen2` UI polish, then integrate bill functionality;
the existing create-bill form stays in place. Stage 6 is complete. Remaining
Stage 4/manual evidence and Stage 7 closeout do not block UI work. Keep the
labelled retention test bill intact for the remaining follow-up;
recheck affected critical journeys if UI changes alter forms, receipt confirmation
or payment flows. First local UI cleanup on Oct 26 removes the expense-history
Filter button; category/person selections now apply automatically without
scrolling to the top. It is included in the local UI follow-up above and has not
been deployed.

### Approved design rollout — Oct 26

- User approved applying the system **across the app**, **Animate UI** as the
  default icon library, and **one-button receipt scanning**. Round corners and
  Relaxed spacing are locked, along with all previous reference refinements.
- Canonical tokens: `src/components/design-system/tokens.css`: #663399, 22px/32px
  corners, 48px controls, 28px panels, 18px rows, frost 45. User changed typography
  to Helvetica throughout, with Bold (700) headings and global errors, with system
  fallbacks. Removed the serif loader/assets; reference and app use one font.
  App surfaces and semantic utilities use those tokens.
  Typography follow-up: five focused browser checks pass across Chromium,
  WebKit and iPhone emulation; lint, formatting and production build pass.
- `/design-system` remains development-only. Approved foundations are read-only;
  copy tokens, sample interactions, motion replay, both icon libraries and the
  closed/open/selected picker gallery remain. The main app and reference share
  button, field, checkbox and picker implementations.
- Four-piece tilted purple SVG is the canonical mark (`src/app/icon.svg`), used
  in both headers and Next icon metadata. `npm run icons:generate` derives the
  16/32/48px ICO and 180px Apple icon. Reviewed small mark on light/dark surfaces.
- App rollout covers create/join/claim, bill/participants/ledger/filters, expense
  editing, receipt review/status, balances/payments/QR, deletion and error states.
  Split checks are circles inside clickable pills; fields have one inner focus
  stroke; menus use Radix and person options include avatars/checks. Business
  actions, currencies, allocations, confirmation and stale-write checks remain.
- `SelectControl` uses a native form bridge preserving real IDs, empty filter
  values, disabled/required semantics and FormData. `RetainedForm` dispatches
  native changes when restoring values; selected people/exact shares survive a
  rejected action and successful forms reset. Controlled split checks reset only
  after a successful save. Do not replace the native bridge with display labels.
- Oct 27 dropdown fix: menus grow to at least 240px (or trigger width) within
  viewport bounds. Option labels use an explicit `data-option-text` hook with
  no wrapping and ellipsis for unusually long names; titles retain the full text.
  A grid reserves the checkmark column on every row, including unselected rows.
  Eight focused picker/form/layout browser checks pass across Chromium, WebKit
  and iPhone emulation, including 120px triggers and 320/375/1280px viewports.
- Oct 27 calendar preview: `/design-system#date-picker` uses the reusable
  controlled ISO-date `DatePicker` in `src/components/ui/`, DayPicker 10.0.2 and
  Animate UI Popover/Dialog (Radix peer 1.8.1). Includes purple date circles,
  outlined today, bold Helvetica, Today/Yesterday, six stable weeks, 240ms entry,
  300ms month navigation and 150ms selection. Narrow/short viewports or anchors
  with insufficient vertical room use a centered panel, keeping shortcuts visible.
  The trigger waits for responsive hydration so WebKit cannot lose its first click.
  Keyboard arrows/Enter/Escape, focus restoration, local date-only behavior in a
  negative UTC offset, reduced motion, mobile bounds and axe are browser-tested.
  Final focused verification passed all 17 calendar/reference checks across
  Chromium, WebKit and iPhone emulation; lint, formatting, 298 offline tests and
  the Next production build also pass (8 hosted/provider tests remain skipped).
  Live form date fields remain native; user accepted a design-page preview first.
- Receipt selection starts `useDirectImageUpload.start()` directly. Existing
  `submit(event)` remains for QR inspection. Cancellation is a no-op; the running
  guard prevents duplicates. Retry reuses file/reservation; changing images clears
  it. Receipt confirmation still creates the expense; QR still requires saving.
- Premium motion: short press/selection/reveal transitions; Animate UI action
  icons; one soft white 1.8s shimmer. Reduced motion stays functional and still.
- Final verification: 298 offline tests pass (8 hosted/provider tests skipped),
  lint/format/build pass, and 30 offline browser checks pass across Chromium,
  WebKit and iPhone emulation. Axe, keyboard menus/focus, errors/reset, exact
  shares, one-button upload retry, icon metadata, 320/375/768/1280 reflow and
  reduced motion are covered. Main/reference/phone screenshots were reviewed.
  Browser forms use mocked actions/uploads; no hosted write/provider call,
  migration, commit, push or deployment. Retention fixture remains intact.
- Repeat offline browser checks with `npm run test:e2e:design`, or set
  `PLAYWRIGHT_BASE_URL=http://localhost:3000` for an existing dev server. This
  config excludes hosted-write tests even if a live opt-in flag is present.
- Real-device/screen-reader/full keyboard/Firefox signoff remains user-owned.

## Resume here — Oct 25 sweep and image-preservation checks passed

Read-only follow-up **2026-10-25, approximately 18:55–18:57 GMT+7**, after the
user returned later than the scheduled cleanup window:

- **Six Stage 6 final sweeps passed:** compared the original target IDs against
  the current queue; **0 of 6 remain**, and all six exact bucket prefixes are
  empty. No manual cleanup, queue claim, deadline change or deletion ran here.
  The original earlier cohort of 13 was already verified absent on Oct 24.
- **Confirmed-image preservation passed across the cleanup interval:** retained
  bill/scan still exist, confirmed at the same timestamp, attempt_count=1, exactly
  the same single $12 expense ID. Image is **59,685 bytes**, SHA-256 exactly
  `22436e187cf8ffa053336b943d06a8a98e9a22123dbd88e5d09f4d02f9db982e`,
  matching the Oct 24 baseline. Aggregate totals remain **20 bills, 9 confirmed
  receipts, 11 expenses**, including the retained fixture (original baseline
  19/8/10 after subtracting it).
- **Fresh hosted UI passed in a separate incognito session:** opened the known
  receipt URL after the old image URL would have expired. AX and screenshot
  showed **Receipt confirmed**, **Uploaded receipt**, the actual synthetic image,
  no missing-image fallback or reconfirmation form. No join or mutation occurred.
  Normal-session reload/direct navigation showed a blank content area, so this
  session is not claimed as a passed owner-session recheck; cause unestablished.
  The separate private session and stored byte comparison supply actual evidence.
- **Three later jobs remain, now due:** final deadlines **Oct 25 15:42:50 GMT+7**;
  attempts=1, unleased. These became eligible after today's morning schedule,
  so the **Oct 26 03:00–03:59 GMT+7** run is their first scheduled opportunity.
  They were not accelerated or processed manually. Keep the retained fixture
  active for that remaining follow-up, then remove only it through lifecycle.
- **Scheduled-log evidence still missing:** no exact execution time/aggregate
  response was recovered. Prior verified Vercel access allowed only the last
  hour; today's scheduled window was about 15 hours before this check. Later
  native-browser control timed out before a fresh dashboard inspection, so no
  new claim about today's dashboard contents is made. Queue transitions are
  consistent with scheduled processing but do not independently identify the
  invocation source. Do not invent a cron result from the successful outcome.
- Report `/private/tmp/stage4-followup-2026-10-25.json` contains safe aggregate
  results and the synthetic image hash. No provider request, scan, quota reset,
  hosted write, credentials/settings change, migration, runtime edit, commit,
  push or deployment. Sentry was not rechecked in this follow-up; prior incident
  remains open. Local changes are Markdown only; formatting/diff checks passed.

The cleanup outcome and retained-image checks can be verified during the day;
missing the log window does not erase that evidence. Direct scheduled-run log
capture remains a separate incomplete evidence item, as do the three later
sweeps and the user's manual/device checks. No new reminder/automation was set.

### Retained-image fixture prepared — Oct 24, 18:33–18:38 GMT+7

The user asked to continue after discussion of the missing preservation check.
Created **one labelled synthetic Production bill** through the current app and
left it active so its confirmed image can be tested across scheduled cleanup.
Do not delete it before that check. The earlier read-only audit below is a
separate observation; this continuation deliberately adds the following fixture.

- Bill name: `Stage 4 retained image synthetic 2026-10-24`; creator
  `Retention Test Owner`, USD. Bill ID `136dbff2-d8e9-44b6-ba66-bbefce658a58`.
- Generated noncustomer PNG `stage4-retained-receipt-2026-10-24.png`: Noodles
  1 x $5, Drinks 2 x $3.50, total $12, zero tax/tip/discount. Uploaded once through
  Production; **one new Gemini request / one application extraction attempt**,
  no retry or local provider diagnostic. Fixture extract_bill counter used=1.
  Including Stage 6, recorded tests now total four provider requests and three
  application attempts across the two sessions; this is historical accounting,
  not a claim that expired/current rate-limit windows share one counter.
- Draft metadata before confirmation: processing, attempt_count=1, zero expenses.
  UI then displayed the correct two-item review and low-confidence warnings.
  Reviewed every amount and submitted confirmation exactly once.
- Scan ID `61e573a9-2292-4168-ba8c-9e5c8baeec85`, confirmed at **18:36:46 GMT+7**;
  exactly one $12 expense named `Stage 4 synthetic retained receipt - USD 12`,
  with the single synthetic owner assigned $12. No payment was recorded.
- Metadata at **18:37:28 GMT+7**: **20 bills, 9 confirmed receipts, 11 expenses**
  including this one fixture; previous baseline remains 19/8/10 after subtracting
  it. Pending file jobs remain **9**, all previously future; no cleanup invoked.
- Image downloaded only for this generated fixture to establish a byte baseline:
  **59,685 bytes**, SHA-256
  `22436e187cf8ffa053336b943d06a8a98e9a22123dbd88e5d09f4d02f9db982e`.
  It reopened from the ledger's **View receipt** link; screenshot and AX showed
  **Receipt confirmed** and the actual uploaded image, no reconfirmation form or
  missing-image fallback. This is pre-cleanup evidence only.
- Leave the Chrome receipt tab available: its private bill capability is not
  copied into tracked documentation. If necessary, find its labelled page in
  browser history. Local generated image and metadata are in
  `/private/tmp/stage4-retained-receipt-2026-10-24.png` and
  `/private/tmp/stage4-retention-fixture.json`; do not commit private fixture data.
- **Next:** after the Oct 25 scheduled run, reopen/refresh this same receipt to
  obtain a fresh image URL, compare its stored bytes/hash and verify unchanged
  confirmed status and single expense. Capture scheduled-run logs promptly and
  verify the six due Stage 6 sweeps. Keep the fixture through any additional
  preservation check needed for the Oct 26 run, then clean up only this labelled
  fixture through the lifecycle flow and record normal future final sweeps.
- No runtime code, credentials, hosting settings, migration, deployment, quota
  deadlines or shared policies changed. The pre-existing local edit to
  `src/server/bills.js` was left untouched; it was not part of this task or deployed.
  The native file chooser initially stalled; no upload/provider request happened
  until the correct generated file was selected and Upload receipt pressed once.

Read-only checks on **2026-10-24, approximately 17:42–17:46 GMT+7** continued
the Stage 4/6 follow-up. The user will do the remaining real-device,
VoiceOver/TalkBack, full keyboard and Firefox checks themselves; no result is
implied by assigning that work. Preview configuration remains deferred.

### Current deployment, cleanup and monitoring evidence

- Chrome verified current **Ready / Production / Current** deployment
  [HYZYcPFFEy2ba7uueMnftaYM6k6p](https://vercel.com/nacarees-projects/bill-spiltter-webapp/HYZYcPFFEy2ba7uueMnftaYM6k6p),
  source `876c22f845824eaf1bf039382cab8b6dfc894832`, built Oct 24 12:30:42 GMT+7,
  with the normal Production alias and immutable host
  `bill-spiltter-webapp-pfz7vxp7t-nacarees-projects.vercel.app`.
  Local Git comparison confirms only README/HANDOFF/CURRENT_WORK changed since
  Stage 6's tested `eec047e`; runtime source is unchanged. No deployment was made.
- Supabase metadata audit at **17:42:39 GMT+7**, exact expected project
  `uvznqgkbodejvksmtafh`: **19 bills, 8 confirmed receipts, 10 expenses**;
  **0 expired bills, expired drafts, stale upload reservations or counter windows
  older than the worker's 24-hour cutoff**. These totals match the recorded
  baseline; they are not an individual financial-record integrity comparison.
- **Original 13 jobs no longer queued.** All nine current jobs were created
  after the original cohort. All are unleased, attempt count 1, not yet due:
  six correspond to Stage 6 fixtures, with final deadlines **Oct 25 00:38:43
  and 00:48:02 GMT+7**; three belong to a later deletion, created **Oct 24
  15:42:50 GMT+7**, due **Oct 25 15:42:50 GMT+7**. This follow-up created/deleted
  nothing and did not investigate the later bill's contents or who deleted it.
- Storage metadata inventory at **17:43 GMT+7** found **0 receipt images,
  0 staging objects, 1 payment QR under an existing bill**. No object in any of
  the three buckets belongs to an absent bill. All nine queued prefix targets
  are empty and their parents absent. Combined with the empty receipt/staging
  buckets, this verifies original cleanup targets are absent; original job IDs
  and per-job completion times are no longer available from the queue.
- **Retained-image evidence gap:** all eight existing confirmed scan references
  lack images. Individual Storage `exists` checks returned false with HTTP 400;
  bucket listing separately succeeded and was empty. Their confirmations range
  from Aug 16 through Oct 21 GMT+7, before the Oct 22 retention rollout. The
  historical release deliberately deleted images after confirmation (see the
  coordinated-rollout runbook). This is consistent with historical missing
  images, but does not prove when or why each file disappeared. Do not call it
  a newly demonstrated cron defect or claim retained-image preservation passed.
  Stage 6 did verify a fresh confirmed image before its fixture was deleted.
  No surviving post-rollout confirmed image exists for the post-sweep UI check.
- Vercel **Cron Jobs enabled**, route `/api/cron/lifecycle-cleanup`, displayed
  **20:00 UTC daily**, reverified in Chrome. Runtime logs offered the last
  30 minutes/hour; older ranges required an upgrade, and the date picker marked
  today's 03:00 start **Outside of allowed range**. No plan/settings change or
  dashboard Run action was made. Thus queue progress is independently observed,
  while the first time-triggered invocation and its aggregate log remain
  **unverified**, not failed. Absence of old logs is not proof of a missed run.
- Sentry session restored through existing GitHub sign-in. At the recheck,
  [BILL-SPLITTER-WEBAPP-7](https://nathan-d2.sentry.io/issues/7809205412/)
  remained unresolved, **1 event**, first/last seen about 17 hours earlier,
  release `eec047e`; no recurrence or new upstream classification. The all-status
  14-day project inventory showed seven historical issues and no lifecycle
  cleanup issue. No issue was resolved/commented on; no provider request made.
- All hosted work was read-only: no queue claim/finish, SQL mutation, cleanup
  invocation, uploads, generated fixtures, provider calls, quota reset, secret
  reveal, settings edit, migration, deployment, commit or push. Local Markdown
  edits record evidence and ownership only. Markdown formatting and diff checks
  passed; runtime tests were not rerun for documentation-only changes.

### Stage 7 evidence register — prepared, not signed off

| Check                              | Latest outcome                                                                       | Remaining action / owner                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Stage 1 baseline / Stage 3 rollout | Recorded; migration and smoke checks user-reported applied/passed                    | No migration rerun.                                                                         |
| Stage 2 recovery                   | Explicitly skipped by user                                                           | Retain the exception; do not claim a restore rehearsal.                                     |
| Stage 4 original final sweeps      | Original 13 jobs gone; cleanup targets absent; aggregate baseline unchanged          | Scheduled invocation/result still needs direct evidence.                                    |
| Stage 4 later sweeps               | Six Stage 6 jobs gone/targets empty on Oct 25; three later jobs now due              | Verify three after their first scheduled opportunity on Oct 26.                             |
| Confirmed image preservation       | Passed Oct 25: exact image hash retained, same single expense, fresh private UI view | Keep fixture for Oct 26 follow-up, then lifecycle cleanup.                                  |
| Stage 5 credentials                | Runbooks/offline readiness complete; rotations separate; Preview deferred            | Keep existing authorization/configuration boundaries.                                       |
| Stage 6 deployed functional flows  | Passed with upstream incident recorded                                               | Monitor BILL-SPLITTER-WEBAPP-7; safe status/classification on recurrence.                   |
| Manual/device accessibility        | Automated checks passed; remaining manual evidence unverified                        | User: real devices, VoiceOver/TalkBack, full keyboard, Firefox; record environment/outcome. |
| Phase 4 / Stage 7 signoff          | **Open**                                                                             | Complete outstanding evidence above; retain accepted exceptions and incident status.        |

Next daily run **Oct 26 03:00–03:59 GMT+7** can cover the three later jobs.
The six Stage 6 sweeps and image-preservation outcome are verified above. Inspect
runtime/request logs during or within the available hour after execution, record
actual time/status/counts and whether it was scheduled, then recheck queue and
Storage metadata. Do not accelerate deadlines, create another manual run merely
to obtain a successful log, or call a manual invocation scheduled evidence.
No future automation/reminder was created in this session. A resumed check is
needed; the worker itself remains enabled.

## Stage 6 functional checks complete; one provider incident open

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
complete. Stage 4 original/Stage 6 cleanup targets are absent and retained-image
preservation passed Oct 25; scheduled-run evidence and three later sweeps remain.
Stage 5 readiness and Stage 6 functional checks are complete with the provider incident open.
Actual rotations remain separate future actions. Current Production `876c22f`
has the same runtime source as tested `eec047e`. The user owns remaining manual
accessibility checks; see the current Stage 7 evidence register above.

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

| Finding                                                                                                                                                                                                                                | Status     | Evidence / observation                                                                                                                                                                                                                                               | Next action / owner                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production is Ready/current on `main`, commit `32355c4ab85630e9ac5a18475a846a849d8bbd0d`; deployed Oct 21, 01:41:43 GMT+7                                                                                                              | Confirmed  | V: [deployment details](https://vercel.com/nacarees-projects/bill-spiltter-webapp/BSwrfSxw3pgZvudZ6gsowSs4vGEQ)                                                                                                                                                      | Agent: use this release as the baseline; deployment of local changes is a later step.                                                                                                     |
| Production URL: `https://bill-spiltter-webapp.vercel.app/`; immutable URL: `https://bill-spiltter-webapp-87e8ovlpj-nacarees-projects.vercel.app/`; branch alias: `https://bill-spiltter-webapp-git-main-nacarees-projects.vercel.app/` | Confirmed  | V: deployment Domains panel                                                                                                                                                                                                                                          | Agent: use immutable URL when identifying the audited release.                                                                                                                            |
| Latest retained Preview URL/commit/status                                                                                                                                                                                              | Missing    | V: [Preview deployment filter](https://vercel.com/nacarees-projects/bill-spiltter-webapp/deployments?environment=preview) returned No Results; overview had No Active Branches. Project retention is 30 days, so this does not establish that Preview never existed. | Agent: record a future Preview's identity when one is explicitly deployed.                                                                                                                |
| At the last recorded operational audit, checkout was `main` at the audited commit; mobile/accessibility changes were uncommitted and undeployed                                                                                        | Historical | L: `git log -1`, `git status --short` at that audit; current local UI state is summarized at the top                                                                                                                                                                 | This audit snapshot predates the Oct 29 UI follow-up. Do not use it as current Git status.                                                                                                |
| Vercel framework Next.js; build/install/output overrides off; root default `./`; repository build script `next build`                                                                                                                  | Confirmed  | V: [Build and Deployment](https://vercel.com/nacarees-projects/bill-spiltter-webapp/settings/build-and-deployment); L: `package.json`                                                                                                                                | Agent: reconcile README's `npm ci` / webpack override instructions with observed settings in a later documentation task. Historical build internals were not independently reconstructed. |
| Vercel Node `24.x`; local Node `24.22.0`; CI Node `22`                                                                                                                                                                                 | Confirmed  | V: project and deployment runtime settings; L: `node --version`, `.github/workflows/ci.yml`; README recommends Node 22                                                                                                                                               | Agent/user: choose and align a supported version in a later stage; no setting changed.                                                                                                    |
| Vercel team Hobby; Fluid Compute enabled, function region `sin1`, standard 1 vCPU / 2 GB; Standard deployment protection                                                                                                               | Confirmed  | V: project/deployment settings                                                                                                                                                                                                                                       | Agent: retain as operating context.                                                                                                                                                       |

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
complete; Stage 4 daily automation is enabled, original/Stage 6 cleanup targets
absent and retained-image preservation passed; scheduled-run evidence and three later sweeps remain. Stage 5
readiness and Stage 6 functional checks are complete with one provider incident
open; Stage 7 remains open. The current evidence register above supersedes older
dated observations. Work proceeds one stage at a time, with a concise snapshot
in CURRENT_WORK. Hosted migrations remain user-applied.

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
