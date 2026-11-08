# Bill Splitter — Computer Handoff

Read this file and `CURRENT_WORK.md` when resuming.
Current branch: `main`; use `git log -1` for the latest saved commit. The earlier
`work/mobile-accessibility-lifecycle` branch is historical; do not assume it
matches current `main`. Phase 3 implementation is included in this checkout.
Check out/pull `main` and run `npm ci` when moving to another computer.
The user wants migration SQL saved in `supabase/migrations/` and will apply
hosted migrations themselves. Tell them when a new migration is required.

## Screen 2 Atelier integration — Nov 8

The user explicitly clarified **Screen 2 only**. The approved Atelier Expenses
page is now integrated into `/screen2`; live `/b/[shareToken]` pages, server
actions, Supabase schemas and credentials are unchanged. Keep the existing
main-app create-bill form. Real bill-action integration remains future work.
This section supersedes earlier statements that Screen 2 Expenses is pending.

Empty Expenses follow-up (Nov 8): the user supplied a receipt, upward-arrow and
dollar-coin reference to replace the earlier wallet. `ExpenseEmptyArt` now uses
that composition: an upright curled receipt with torn bottom, a lavender arrow
and a warm gold dollar coin, with soft outlines/shadows matching the app.
The arrow is smaller and raised to expose its stem, with its original lighter
purple restored. The arrow/coin group is shifted 6px left, and the arrow alone
is shifted a further 3px left so its center aligns exactly with the coin. Float timing and frame stay unchanged.
Overview retains its two-paper `ReceiptVignette`. Both keep the same 140×112px
frame and existing `ReceiptArt` animator with scanning disabled. The 7px/2.4s
float, easing, pause behavior, reduced-motion handling, copy, spacing and layout
are unchanged by the picture swap.
The approved empty-state heading is **No expenses yet.** There is no divider
below the main Add expense button in the empty state.
The user also removed the duplicate **Add first expense** action; empty Expenses
and the shared Atelier studio preview use the main **Add expense** button above.
The reference-art swap passed three focused Chromium/WebKit/iPhone cases checking the
exact float distance/duration, hidden-tab and drawer pauses, reduced motion,
320/393/1280px reflow/axe and the local add flow. Lint/format/diff checks pass.
The following broader evidence predates the final picture-only swap.
Nine affected browser scenarios were verified across Chromium/WebKit/iPhone
runs: three motion/visibility/pause/reduced-motion/add-flow cases and six existing
empty-gallery/independent-preview cases. The new checks scroll the stable
container and wait for drawer exit before changing motion preference. All three
320/393/1280px layouts passed axe; screenshots under
`/private/tmp/expenses-empty-receipt-*.png` were reviewed. Lint/format/diff and
webpack production build checks pass. No hosted action, schema, dependency or credential change.

`AtelierExpenses` is shared with the studio and accepts canonical expenses,
participants, current identity, controlled search/filter state and Add/Open
callbacks. It keeps the rolling full-ledger total, personal share, count,
shimmer action, approved borderless/morph/press/trace/Soft pop search, torn cards,
all 15 category icons and name-aware vehicles. Screen 2 uses All / Your expenses /
Receipts; Your expenses means any assigned share, including zero-valued shares.
Search includes name, payer and category. Filtering never changes totals.
Dates/year/period and newest-first ordering come from actual local expense data.
The studio retains its Paid by you filter, independent examples and comparisons.

Overview’s recent rows and the Expenses cards open the shared Paper Atelier
drawer over their originating tab via `#overview/detail-<id>` or
`#expenses/detail-<id>`. Existing `#detail-<id>` links fall back to Expenses.
The drawer takes actual participants/current identity and supports equal/exact
editing. Payer IDs stay separate from labels; missing split-method metadata
opens as exact to preserve stored allocations. Saves merge into the canonical
record, preserving receipt flags/items and IDs while updating balances/activity.
The Add chooser and retained manual draft remain; new participants can be selected
in that draft without overwriting earlier selections. Add/edit offer 15 categories.

Receipt viewing remains illustrative: no original-image fetch, upload or provider
call was added. Zoom/Fit and the compact removal modal keep the details mounted.
Closing restores the source tab/list/focus; removed or missing triggers fall back
to See all on populated Overview, or Add expense on Expenses/empty Overview.
The extra icon-only + in Overview’s Recent expenses header was removed at the
user’s request; preserve the original Recent expenses + See all layout.
This correction passed six targeted Chromium/WebKit/iPhone cases covering
Overview removal focus and the Expenses receipt/removal flow, plus lint and
format/diff checks. The broader verification below predates this small correction. Browser Back and embedded-frame history work independently.
Reset restores only that preview. Old Screen 2 search/full-page details/removal
markup and unused CSS were removed. Navigation and new expense controls wait for
hydration so early clicks are retained through the actual interactive controls.

Long category menus opt out of Radix’s appearing scroll buttons through the
optional `SelectControl.scrollButtons` prop, using native viewport scrolling.
This prevents Safari from jumping back to the selected item when a scroll button
mounts. Other menus retain their default behavior. Lower-list Gifts selection
was reproduced failing before the fix and passed in WebKit/iPhone afterward.

Validation: 420 offline tests pass; eight hosted/provider tests remain skipped.
Lint, full formatting, diff checks and the final webpack production build pass.
Source-map uploads were disabled for local builds. The new adapter tests cover
exact-share round trips, payer identity and retained receipt metadata. New browser
coverage exercises filters/totals, owner/guest identity, new participants, exact
edits, receipt/removal layers, legacy links/Back, independent embedded Reset,
normal/reduced motion, forced colors and axe at 320/393/1280px plus short phones.
Phone and desktop screenshots were reviewed. No hosted test, provider extraction,
migration, credential/configuration change, commit, push or deployment ran.

Browser evidence covers 147 distinct cases across Chromium, desktop WebKit and
iPhone emulation: 129 Screen 2/expense-studio cases plus 18 shared-navigation
cases. The consolidated 129-case run recorded 125 passes and four failures.
The initial-focus axe case now waits for the Expenses heading to receive focus;
its three-engine rerun passed. Reduced-motion cleanup now polls for the effect
to finish; its WebKit rerun passed. The WebKit Clear-focus case and iPhone people
morph case encountered document-navigation interruptions and passed isolated
reruns. The navigation suite recorded 17/18 initially; its existing iPhone
receipt-motion timing case passed on an isolated rerun. Product motion timings
were not changed. These are verified scenarios across runs, not a claim of a
single clean 147-case run. Test harnesses wait for hydrated navigation and page
focus. Local artifacts remain under `/private/tmp/atelier-*-results` and
`/private/tmp/atelier-*-recheck`; the ordinary design suite includes the new file.
Operational evidence and real-device/manual signoff remain unchanged and dated.

## Expense drawer checkpoint — Nov 7

The user prefers **Paper Atelier** in `/design-system#expense-drawer`.
**Amethyst Suite** and **Quiet Gallery** remain comparison options. Each has a
phone specimen, working drawer, independent receipt/manual samples, local edits,
removal and Reset/Restore. The original Atelier launcher/cards remain available.
The jump navigation includes **Expense drawers**. Gallery layout expects 24
accessible specimen headings; the extra three are these drawer directions.

Paper Atelier uses a cool white (#fbfbfd) paper surface through Category, with
no outer border or category icon. Its 18px irregular torn edge has a silhouette
shadow and a faint top shadow. Total expense stays large on the left. Your share
is a compact right-aligned block: mixed-case 12px label, 4px gap and 26px semibold
purple amount, vertically centered beside the total. Containers at 300px or less
stack with left-aligned text; larger amounts wrap without horizontal overflow.
One dashed rule separates the amounts from the metadata.

**View original receipt** is an underlined action below Category and above the
torn edge. The separate thumbnail is removed; manual entries omit this action.
`ExpenseReceiptViewer` opens a large centered desktop modal or a full-screen
phone viewer, keeping details mounted behind it. It supports 50–200% zoom,
Fit using available width/height, and touch/keyboard scrolling. Zoom preserves
the viewed center; Fit returns to the top. Close, Escape and the purple **Back to
expense** button restore receipt-trigger focus and the parent's scroll position.
The illustrative sample contains the expense name, date and total; there is no
hosted image fetch. The old thank-you sentence is removed.

**Remove expense** is an outlined red-text button beside the purple **Edit
expense** button in the footer. There is no Done button, ellipsis menu or footer
separator in Paper Atelier. Remove inherits shared button motion, with custom red
surface colors and no resting shadow. `ExpenseRemovalDialog` is a compact
centered Radix AlertDialog over the details drawer. It names the expense and
amount and explains the balance update. Keep expense receives initial focus;
Keep or Escape restores the Remove button. Confirming closes both layers,
updates the local list/totals and restores the list/fallback trigger. Modal
buttons stack at 320px. Editing stays in the existing drawer with validation,
Save and Cancel. Search/filter state and all expense information remain.

`ExpenseDetailSummary` is shared by specimens and drawers. Receipt and removal
modals are shared across the expense-detail previews. The old receipt/removal
modes, thumbnail/menu experiments and their unused CSS/components are removed.
Observers clean up; reduced motion and forced colors have fallbacks. Search's
Clear button also has the approved circular hover background and Soft pop exit.

Final checkpoint checks passed: 417 offline tests, 15 affected Chromium/WebKit/
iPhone browser cases, lint, full formatting, diff checks and the webpack build.
Eight hosted/provider tests were skipped; local source-map uploads were disabled.
Affected browser coverage includes receipt/manual examples, independent edits, zoom/Fit/panning, modal
focus trapping/cancellation, parent scroll restoration, actual removal, list
focus, 320/393/1280px layouts and axe. Short/tall phone and desktop screenshots
were reviewed. Normal-motion Chrome/WebKit checks cover the viewer's zoom limits,
Fit, Escape and Back. WebKit rounds a fully visible fractional label box to an
intersection ratio just below 1; that assertion allows 0.999.

This checkpoint is local design-system work. Screen 2 and real bill-action
integration remain pending; keep the existing main-app create-bill form. No
backend logic, hosted data, migrations, dependencies or credentials changed.
Operational/deployment evidence below remains dated; it was not refreshed by
these UI checks. Keep the retained operational fixture intact.

Latest approved people UX: one drawer, button-to-field morph with a compact purple
**+**, side-by-side add/copy actions, pinned header/footer, soft scroll feather and the
studio's smooth list-entry reveal. Preserve this direction when
integrating real bill actions; keep the existing main-app create-bill form.

Design-system cleanup (Nov 6): removed Fine perforation, Ticket stub, Layered
paper and Corner fold, including Original receipt/Preview controls, the Receipt
cards jump link, retired components/styles and receipt-design switching state.
Atelier uses the approved borderless torn-paper cards directly. Drawer, category,
transport and search previews remain. The deleted comparison test is retired.
Layout coverage at that cleanup checkpoint expected 21 specimen headings and
checked that retired galleries and their navigation/control remnants were absent.
Cleanup verification: six Chromium/WebKit/iPhone cases pass for populated/empty
layout and axe at 320/393/1280px, retained expense search/filter/details and
focus restoration. The drawer launcher's accessible name now includes its
visible label as a contiguous phrase. Tests wait for hydration; the local dev
server was restarted after it stopped during the first check. Lint, full
formatting, diff checks and the production webpack build pass.

Search cleanup also removes the four original search directions (Quiet line,
Liquid glass, Paper frame, Integrated toolbar) and the Focus beam/Soft spotlight/
Gradient rim gallery. Their arrays, controls, decorative component/CSS, original
halo/icon pulse, unused timing tokens and four comparison tests are removed.
The approved borderless/morph/press/circle-then-handle/Soft pop bar stays, along
with mobile, surface and Clear galleries. The expense-search heading now names
the remaining mobile treatments.
Full-page layout/axe checks pass in Chromium, WebKit and iPhone at 320/393/1280px,
with 21 retained headings and no retired option controls. The magnifier check
now uses Playwright's clock, stepping 16ms frames and yielding between steps so
React renders each phase. This avoids missing the 120ms handle on a low-frame-rate
iPhone emulator; application timing stays 280ms circle + 120ms handle.
All three frame-stepped magnifier cases pass, including input/padding/icon
replays, Clear and keyboard entry, reduced motion and glass release. Combined
with the three layout/axe cases, six affected browser cases pass. Lint, full
formatting, diff checks and the production webpack build pass.

Atelier's original receipt cards now omit the outer border. One masked paper
surface forms the rounded top and a 12px-deep torn bottom with a fixed 90px
irregular repeat, enlarged at the user's request. The old separate zigzag strip
is removed for Atelier; a parent drop shadow follows the continuous silhouette.
Content and focus outlines stay
outside the mask; forced colors use an unmasked Canvas surface with no shadow.
The dashed footer divider remains. Journal and the receipt comparison variants
retain their existing shapes.
Receipt follow-up verified at 320/393/1280px, with phone screenshots reviewed;
expense filtering, details and focus restoration pass in Chromium, WebKit and
iPhone emulation. Formatting and diff checks pass.

Expense category icons use `ExpenseCategoryIcon` in the expense concepts.
The receipt-card comparison variants have been retired. It keeps the native Animate
UI runtime and replays once on view entry, pointer
hover, keyboard focus/activation and primary pointer press. Double-rAF resets
keep the pressed SVG mounted; pointer release does not cut off the animation.
Offscreen, hidden-page, open-dialog, forced-color and reduced-motion states
stop playback; no idle loop or layout motion. Amethyst payer initials stay.
Icon follow-up: six Chromium/WebKit/iPhone browser cases pass, checking native
path/opacity changes, view entry, hover/touch/focus replay, offscreen stops,
reduced motion, forced colors, expense filtering, details and focus restoration.
Lint, formatting, diff checks and the production webpack build pass.

All 15 expense categories are now available in the design-system chooser at
`#expense-categories`, with animated icon tiles and Preview category in Atelier.
The chooser changes the first sample expense's category; amounts/counts stay.
`expense-categories.js` maps IDs/labels plus legacy Food & drinks / Transport
aliases; unknown categories use Tag. Samples now distinguish meals, coffee and
taxis. Meals/coffee/groceries/drinks retain the food summary grouping.
Cross/Gift use official Animate UI registry presets. Utensils, ShoppingBasket,
Car, Fuel, Wine, BedDouble, Ticket, Plane and Plug use official Lucide SVGs with
local 700ms Motion presets through the same Animate UI runtime; license and
source details are recorded in icons/README.md. No new package or backend
category schema changes; Screen 2's real category form remains separate.
Expanded-category validation: nine Chromium/WebKit/iPhone cases pass for all
15 actual SVG animations, card replay, Atelier category application, unchanged
totals, details/focus and 320/393/1280px controls; axe passes on the chooser.
Chromium rerun also verifies no console errors after giving the new chooser a
distinct reset key. Phone grid screenshot reviewed. Lint, full formatting,
diff checks and production webpack build pass.

## Expense details drawer — Nov 6

The original implementation below is historical. The Nov 7 checkpoint above
supersedes its receipt/removal modes and the chosen Paper Atelier appearance.

Transport now has three animated vehicle variants, still under the same
Transport & taxis category. `getTransportIconName` performs local token-based
matching of explicit tuk-tuk/rickshaw and motorbike/moto/scooter terms (including
common space/hyphen variants and motobike). Unclear names keep Car; brands alone
do not imply a subtype, and explicit non-transport categories are never changed.
`getExpenseCategory(category, name)` supplies the matching Icon without changing
the category ID/label. Expense rows and details pass the name.
The edit drawer shows a live name match; Save updates the row/header icon.
`#expense-transport-icons` provides all three animated examples plus a name field.
TukTuk/Motorbike are original 24px/2px vector drawings using the existing local
Motion/Animate UI factory. No provider/model request, new dependency or schema.
Thirty pure detection cases pass for spellings, boundaries, fallback and priority.
Name-aware transport validation: six browser cases pass across runs for native
replay and name-aware previews/cards/edit/save in Chromium, WebKit and iPhone.
Both new vehicle SVGs visibly animate; reduced motion stops them. Name edits
update the card and drawer while totals stay, and Groceries overrides a tuk-tuk
name. The demo fits 320/393/1280px, passes axe after using its visible button
content as its accessible name, and its 393px screenshot was reviewed. Lint,
full formatting, diff checks and the production webpack build pass.

Atelier expense details now use `ExpenseDetailDrawer`, launched from cards or
`#expense-drawer`'s Preview expense drawer in Atelier button. One bottom-aligned
DialogPanel switches between details, edit, sample receipt and removal
confirmation. The header/footer stay pinned; body scrolls, including visual
viewport/short-height fallback. DialogPanel's optional `layoutKey` remeasures
footer/header when the view changes. Other concept details remain unchanged.
Edit supports description, USD amount, payer, date, all 15 categories, equal
split participants and notes. Existing reviewExpenseDraft/money helpers validate
and calculate shares; save updates the sample row, total and Nary's share.
Cancel discards changes. Remove names the expense/amount and focuses Keep expense;
confirmation updates local rows/totals. Focus returns to the card, or the Add
button when the original row was removed/filtered out. Search/filter stay.
Receipt content is an illustrative sample, not a hosted receipt image.
Edited dates carry an ISO value/year; Atelier's month label follows the dates.
AnimatedMoney now sets an explicit current-value role/aria-label, avoiding stale
SSR/internal rolling-digit text in assistive output. No backend writes, schema
changes or changes to Screen 2's existing expense/create form.
Drawer validation: nine Chromium/WebKit/iPhone cases pass for edit/cancel/save,
invalid fields, all 15 category choices, split/payer updates, receipt/back,
same-panel identity, preserved search/filter, Escape/reopen, removal confirmation,
updated accessible totals and focus fallback. Layout checks cover 320px phones,
393×500 short viewports and 1280px desktop. Details/edit/removal pass axe; the
393px screenshots were reviewed and the console is clean. A fresh session key
resets the view on reopening without changing the closing panel's contents.
The launcher repopulates its sample when all local expenses were removed.
Final six focused drawer cases also pass after preventing edit-focus scroll and
guarding the launcher until hydration; tests wait for actual controls rather
than the full page load event. Lint, formatting, diff checks and the final
production webpack build pass.

## Clear button comparisons — Nov 6

`/design-system#expense-search-clear` adds Soft twist, Stroke erase and Soft pop
above the earlier search galleries. All use the approved borderless / morph /
press / Animate UI Search combination and begin with `coffee`, so Clear is
ready to try. Refill example restores that query; search/filter data stays local
to each specimen. Preview in Atelier carries a new independent `clearMotion`
choice and fills `coffee` so the selected Clear is ready to try there. Older
previews reset it to `none`. The user selected **Soft pop**, now Atelier's
default Clear (`searchClearMotion="pop"`) with the approved borderless surface,
morph/press and the selected magnifier animation. Soft pop starts selected in the
gallery. Other effects remain comparisons. No Screen 2 or hosted changes.
Soft-pop default validation: nine affected Chromium/WebKit/iPhone-emulation
checks pass, including initial selection, clear exits/retyping, magnifier
trace replay and surface/Atelier previews. Lint, full formatting and diff checks pass.

`ExpenseSearchClear` keeps the departing control mounted through a 220ms exit,
clears the query immediately and restores input focus. Departing controls are
disabled, removed from keyboard/accessibility navigation and cannot clear new
text. Retyping during exit restores the same control safely. Soft twist uses
the existing official Animate UI X preset at 2.5x speed plus shrink/fade; Stroke
erase retracts its native strokes toward the center over 180ms; Soft pop uses a
spring entrance, touch compression and fade/shrink exit. The 44px target and
keyboard focus outline remain. Slot width collapses with the animation to make
room for the input; reduced motion changes immediately. Timings live in
`searchClearTiming`. No new dependency or migration.
Validation: 12 distinct affected browser cases pass across the main run and
focused reruns on Chromium, WebKit and iPhone emulation. New checks cover the
three previews, ready-to-clear Atelier selection, immediate query clearing,
focus, 44px targets / 320px fit, reduced motion, keyboard clearing, disabled /
hidden exit controls, actual exit progress, rapid retyping and axe on populated
specimens. Short exits are recorded with an in-browser observer to avoid
missing their 220ms lifetime. Empty phone preview screenshots reviewed. One
original-glass iPhone gesture timeout passed in isolation. Lint, formatting
and diff checks pass. No hosted/provider tests were run.

## Search surface comparisons — Nov 6

Latest motion trial: circle first, then handle replaces the earlier 600ms
continuous trace on the approved Borderless / morph / press search. The same
Animate UI/Lucide artwork now uses an 8px circle starting at the lower-right
junction (280ms), followed by an outward handle draw to (21,21) (120ms).
The handle stays hidden during the circle phase. Both strokes show fully at
rest, on cancellation and with reduced motion. Timings are
`searchTraceTiming.circle` / `.handle` in seconds. The original vendor
component and native 800ms preset remain unchanged for other comparisons.
This is a documented local Motion adaptation of the same artwork. Existing
press replay, keyboard, Clear, visibility and reduced-motion behavior stays.
Both stages derive from one MotionValue clock, preventing a one-frame early
handle flash seen in the initial iPhone check. Validation: nine distinct affected
browser cases pass across the main run and focused reruns on Chromium, WebKit
and iPhone emulation. In-browser frame recording confirms partial circle with
hidden handle, completed circle before handle progress, replay, full resting
strokes, quiet Clear and reduced motion. Clear/mobile regressions pass.
Lint, full formatting and diff checks pass.

`/design-system#expense-search-surfaces` compares Quiet glass, Borderless glass
and Fine underline, all with the existing Search morph + Glass press. New
`surface` prop is independent of `design` / `effect`; Preview in Atelier carries
all three and switching back to an older option restores `surface="original"`.
The user selected **Borderless glass + Search morph + Glass press**. Atelier now
opens with `design="tint"`, `surface="borderless"`, `effect="morph-press"`;
the Borderless glass gallery option starts selected. Other treatments remain
available for comparison. This selection applies to the studio's Atelier
Expenses preview; Screen 2 / real bill action integration remains pending.
Default-selection validation: nine affected Chromium/WebKit/iPhone-emulation
checks pass, including initial selection, original comparison access, mobile
reflow and axe. Lint, full formatting and diff checks pass.

Latest icon selection: replaced the custom magnifier with the official Animate
UI Search component fetched from `https://animate-ui.com/r/icons-lucide-search.json`
on Nov 6. Its Lucide artwork and library variants are preserved; TypeScript-only
adaptation and the existing MIT + Commons Clause license are documented in the
icons README. The shared `ExpenseSearchIcon` now uses this component, including
other expense concepts. The approved Borderless glass + morph/press draws it
on each input/icon/padding press, repeated presses while focused and keyboard
entry, using Animate UI's built-in 800ms `path` preset. The old custom 380ms /
70ms-stagger drawing was removed. The standalone Magnifier draw comparison also
uses the official preset. Other surfaces keep their existing interaction choices.
`ExpenseSearchMobileEffect` signals the library controller via stable callbacks;
replays reset it across two frames without replacing a pressed SVG. Glass
release and icon playback are independent.
Clear retains focus without replay. Blur, scroll cancellation, hidden/offscreen,
dialogs, forced colors and reduced motion cancel drawing, restoring full ink.
Tapping field padding focuses the input immediately.
Clear's synchronous focus restoration is marked so focus-based motion does not
replay when WebKit temporarily blurs the input. Latest icon-replacement validation:
12 affected browser cases pass in one run on Chromium, WebKit and iPhone emulation.
The gesture checks sample the library's actual partial strokes, official geometry,
repeated input/icon/padding taps, keyboard entry, independent glass release, quiet
Clear and reduced-motion cleanup. Resting/mid-draw phone screenshots reviewed.
Lint, full formatting and diff checks pass.

Quiet glass has one neutral 1px edge that turns purple on focus, with no focus
halo/shadow. Borderless glass has transparent borders and a faint bottom shadow;
touch focus deepens the fill. Keyboard focus adds one inset stroke.
Follow-up adds a soft brand-purple underglow using downward shadows with negative spread
(24% while the input is focused for typing, softened from 42%). The neutral shadow
stays at its idle strength while focused. Idle keeps only its neutral shadow;
the purple glow fades in/out through the existing 200ms focus transition.
Typing-only follow-up verified idle, input focus, Clear, Cancel and blur in
Chromium, WebKit and iPhone emulation; Chromium forced colors suppress the glow.
The approved borderless press tint now covers the entire rounded field: its
border width is zero, the moving tint overscans its clip by 2px, and its inset
shadow omits the white highlight. The 3% focus tint and 24% typing-only underglow
stay. Other search surface comparisons keep their existing glass press material.
Full-field follow-up: all three surface browser cases pass (Chromium, WebKit,
iPhone); held-press bounds cover every clipped edge, release fades out, and the
393px pressed screenshot was reviewed. Formatting and diff checks pass.
The top and side edges stay quiet, with no surrounding halo or border. Forced
colors remove the shadow. The 3% focused surface tint stays.
Underglow verification: three surface cases pass across Chromium, WebKit and
iPhone emulation across runs, including 320/393/1280px fit and axe. The WebKit
interaction timeout passed after waiting for the input to become editable;
that readiness guard stays in the existing test. Focused phone screenshot
reviewed; formatting and diff checks pass.
Pointer/Tab origin is tracked on the control so native text-input focus-visible heuristics
do not add a stroke to touch interactions. Fine underline uses a transparent,
square-edged field with a single 1px bottom line that turns purple on focus.
It omits the glass material but retains the same press layer and morph layout.
Forced colors keep a system focus outline. Shared surface overrides remove the
outer halo; older comparisons are retained. No dependencies, hosted writes,
migrations or deployment.
Validation: 18 affected browser cases pass across Chromium, WebKit and iPhone
emulation, covering all three surfaces at 320/393/1280px, single-edge styling,
pointer versus keyboard focus, forced colors (Chromium), press/morph behavior,
Clear/Cancel/Escape, Atelier previews and axe. Phone-sized screenshots reviewed.
Lint, full formatting and diff checks pass.

## Mobile search comparisons — Nov 6

Follow-up adds a sixth **Search morph + Glass press** specimen. Its
`morph-press` option composes the existing morph layout/Cancel behavior with
the unchanged press animation via `mobileEffect="press"`; no timing or separate
animation implementation was added. Clear keeps the input focused and mode
open; Cancel/Escape clears search and focuses the surrounding group. The
combined option is available through Preview in Atelier alongside both original
directions. Liquid glass remains the default while comparisons continue.
Combined validation: 15 affected browser checks pass across Chromium, WebKit and
iPhone emulation, including simultaneous press/release and morph, stable text,
Cancel/Escape/Clear, Atelier preview, reduced motion, 320/393/1280px fit and axe.
Phone preview screenshot reviewed; lint, formatting and diff checks pass.

`/design-system#expense-search-mobile` adds five touch-first specimens above the
earlier light effects and original search designs: Tap ripple (480ms lavender
wave from the touch position), Glass press (100ms inset depression / 280ms soft
release with steady text), Center-out underline (240ms focus line), Magnifier
draw (380ms circle/handle strokes, 70ms handle delay), and Search morph (240ms
field resize to reveal a 64px Cancel target). Each has independent search,
filters, clear, inspiration links and Preview in Atelier. Liquid glass remains
the default; no option is approved for Screen 2 integration yet.

Search morph opens on input focus; Cancel/Escape clears the query, restores
width and focuses the surrounding group so the input/phone keyboard can close.
Clear retains input focus and the open mode. Collapsed Cancel is hidden/inert.
Search selection remounts only the search control, preserving Atelier expenses
and query/filter state. `ExpenseSearchMobileEffect` owns gesture animations and
cleanup; first-focus gestures wait for visibility observation when necessary.
Scroll pointer cancellation, offscreen/hidden/dialog state, reduced motion and
forced colors cancel decorative animations. Static native focus styling stays.
The underline retracts on blur; Clear does not redraw the magnifier. Timing is
in `mobileSearchTiming`. No new dependencies, migration, hosted operation or
deployment. Real phone keyboard testing remains user-owned.
Validation: all 30 distinct expense browser cases passed across Chromium,
WebKit and iPhone emulation across the main run and affected reruns. The six
new mobile cases cover independent search/filters, Atelier selection, Cancel /
Escape / Clear focus, 320/393/1280px fit, gesture motion, stable text, ripple
geometry, reduced motion and axe. One WebKit preview selection failed during
the concurrent check/build window and passed in isolation; no cause is proven.
Phone-sized screenshots reviewed. Lint, full formatting, diff checks and the
webpack build pass. No hosted/provider tests were run.

## Search light effect comparisons — Nov 5

The Focus beam, Soft spotlight and Gradient rim gallery was retired during
Nov 6 cleanup, alongside Quiet line, Liquid glass, Paper frame and Integrated
toolbar. `ExpenseSearchEffect`, its CSS, the old input halo/icon pulse and their
unused timing tokens were removed. Their comparison-only tests were retired.
Mobile effects, surfaces, Clear comparisons and the approved Atelier search
remain; the following Nov 5 notes describe historical explorations.

## Expense search alternatives — Nov 5

The four receipt-card alternatives formerly at `#expense-cards` were retired
during the Nov 6 cleanup. Their components, styles, preview switching and
comparison-specific test were removed; Atelier keeps its approved torn shape.

Atelier's hierarchy uses the bill name above a 32px title. A full-width purple
**+ Add expense** action sits below the total/share summary, followed by the
glass search field with exactly 16px between the button and search. The button
uses 16px text and a 48px target. The summary reads Total spent (14px), amount
(44px) with currency (14px), then personal share on the left and expense count
on the right (both 14px). A fine bottom divider groups the summary above the
Add/search controls. The black top rule and promotional sentence were removed.
The title-to-summary gap is 16px (tightened by 8px); the Total spent label sits
4px above the amount (tightened by 4px). Font sizes and share/count alignment stay.
Search and filters do not change either the total or the total personal share.
All `DesignButton` actions now share the soft feedback: 98.5% compression over
100ms, a gentle 280ms overshoot-and-settle release, and 1px lift with subtle edge
brightening on fine-pointer hover. Existing primary/secondary shadows tighten
on press. There is no added inner edge highlight on primary actions. The old
340ms click bounce and Atelier-only opt-in were removed. `Button` and
`DesignCopyButton` already wrap this shared component, so Screen2 actions,
headers, forms and dialogs inherit it. Custom glass/chooser surfaces retain
their fill, border and shadow overrides. Touch avoids hover styles; disabled
and reduced-motion buttons stay still, with native keyboard/submit behavior.
Outlined-button hover fills the top inset edge with the same lavender tint as
the surface, removing the white inner arc while retaining the outer outline.
The people drawer's Add person reveal now composes its 100ms opacity fade with
`--ds-button-transitions` from the shared button. Its former opacity-only
transition overrode transform/color/shadow transitions and made hover snap.
The regression samples actual intermediate lift positions and checks that the
inline name field still reveals and receives focus.
All 18 targeted hover/people-drawer browser checks pass across Chrome, Safari
and iPhone emulation, including reduced motion and repeated entry.
`tests/e2e/button-feedback.spec.js` exercises studio/Screen2 variants, release
settling, drawer activation and disabled/reduced-motion behavior across browsers.
Validation: 10 button/copy unit checks and 62 distinct browser cases verified.
The first broad run passed 59/62; the home-navigation and metadata/axe checks
passed isolated reruns. The drawer-motion test now freezes CSS animation before
mounting for deterministic inspection; its Chrome/Safari/iPhone reruns pass.
All six new shared-feedback cases passed in the initial run. No dialog behavior
was changed for that test fix.
The Add button keeps the perimeter-light look of the user's
[21st.dev / Magic UI reference](https://21st.dev/@dillionverma/components/shimmer-button),
now with the requested constant speed and a following purple glow. An SVG
rounded rectangle normalizes the entire perimeter with `pathLength=100`.
A single linear stroke-dashoffset animation continuously advances one orbit
every 8 seconds, with no resting interval, fade or angular holds.
Twenty-four translucent 1.5px strokes
form a smoothly tapered white glint over 12% of the path. Stroke and purple glow
are now one rendered object: the SVG's own painted alpha generates four purple
drop-shadow layers (2px, 5px, 12px and 12px), providing a visible broad bloom.
The selected Soft satin treatment sets the combined stroke group to 65%
opacity (35% dimmer) and lowers the glow alphas to soften the overall bloom
by about half. The 12% path length and active travel speed stay.
The leading edge uses the same thin tapered stroke as the rest of the shimmer;
the separate rounded hotspot was removed to keep it subtle and uniform.
The glow inherits the shimmer's exact shape and motion, including corners.
There is one SVG, one moving stroke group and one animation. The separate HTML glow
blob, position follower, resize observer and animation-frame loop were removed.
Filtering the outer SVG renders correctly in Safari. CSS geometry adapts to
the button dimensions and radius on resize. The broad softness was inspired by
the user's [Rainbow Button reference](https://magicui.design/docs/components/rainbow-button).
The purple surface and label stay steady.
`ButtonStrokeShimmer` observes visibility and document
visibility, and pauses for its dialogs plus Radix scroll locks. Pauses preserve
the animation phase for both stroke and following halo. Observers/listeners and animations clean up on unmount;
reduced motion and forced colors hide the artwork, leaving a plain purple button.
`addExpenseStrokeTiming` owns the loop timing.
The list heading reads OCTOBER 2026 on the left, matching Screen 2's `.listDate`:
10px/600, 0.09em tracking, #68606d and 10px bottom spacing. The former decorative
title and abbreviated date pair were removed.
The total uses Overview's shared `AnimatedMoney` component and 1.1-second
NumberFlow timing. Expense additions update the rolling value; search and
filter changes retain the same total. Initial rendering is still, and reduced
motion updates immediately. Formatting and USD precision stay shared.

Approved search: Liquid glass (internal design id `tint`) keeps the 16px rounded
shape and purple magnifier. The bar directly reuses `system.glass`: the shared
frosted fill, blur/opacity tokens, edge highlights, shadow and hover sheen.
It inherits the material's opaque/reduced-transparency and forced-colors
fallbacks. The field stays transparent inside the shell; focus retains its
purple border/halo and icon pulse, and blur restores the shared glass shadow.
Atelier defaults to this design. Its filters now use
three equal-width columns, centered 13px labels and 48px targets. A single 2px
purple underline with rounded ends spans the selected column. Motion animates
its horizontal position with a spring (stiffness 420, damping 24, mass 0.8):
a small overshoot followed by a quick settle replaces the earlier stroke stretch.
Rapid changes preserve the current position and velocity. Percentage translation
keeps it aligned when resized; initial rendering stays still. The selected label
rises 1px and scales to 1.02 over 240ms, matching the main navbar's duration.
The stroke is clipped to the tab row.
The selected tab has no background tint or glow.
There is no gray baseline. Reduced motion moves the underline immediately,
keeps labels still; forced colors uses a system highlight for the underline.
Timing is in `expenseFilterSpring` and `expenseFilterTiming`. Clicking the input
or its icon fades the border to purple over 200ms, plays a 400ms lavender halo
that expands to 6px and settles to 3px, and enlarges the magnifier by 8% before
returning over 300ms. Repeat clicks and Enter replay the effect. The border and
a faint halo stay while typing. Clicking the icon focuses the field through
its label. Clear does not replay the effect. Blur, design changes, reduced
motion and unmount cancel playback. Timing is in `searchIconTiming` and
`searchFocusTiming`. Reduced motion keeps a static focus indicator; forced
colors restores a system outline. Focus does not delay caret placement.

The user prefers Atelier and requested its list use the receipt-card reference.
Atelier now has category icons, separate date/source footers, dashed rules and
torn paper edges. Its expense count is 14px, increased from 9px for readability.
Its active filters use brand purple. Search input styling
must override the global input defaults: native appearance alone did not remove
the white background and 22px radius because the global selector was stronger.

`/design-system#expense-search` compares Quiet line, Liquid glass, Paper frame and
Integrated toolbar. Each filters independent sample expenses and clears search
with focus returned to the input. Preview in Atelier selects the shared
`ExpenseSearch` design, switches to populated mode if needed, and focuses/scrolls
to that search control. Preview choices are session-local; Screen 2 integration
remains pending. All 18 expense browser checks pass on the main localhost
server. Chromium, WebKit and iPhone emulation cover click/touch/Enter animation,
replay and reduced motion, search/filter independence, input clearing, focus,
receipt details and switching without losing additions, preview selection,
empty-mode transitions, 320/393px fit and axe.
Lint, formatting and diff checks pass; desktop/phone screenshots reviewed.

The main development server was restarted with webpack. Use
`http://localhost:3000` with this default host: Next 16.4.3 blocks the HMR request
from `127.0.0.1` as a different development origin, which prevented hydration
in earlier checks. Those failures were caused by the check's hostname, not the
gallery. The isolated server used `-H 127.0.0.1` and worked with that hostname.

## Earlier Expenses page discussion — Nov 4

The earlier agent recommendation was Daily ledger's structure with Atelier's
visual polish. The user's later preference and gallery changes are recorded
above. Keep all six concepts available for comparison.

- Prioritize what was spent, who paid and the current participant's share.
- Compact header with bill name and Add expense; quiet expense count/bill total.
- Date-grouped rows: description, payer, total, personal share, receipt indicator.
  Search plus All/Paid by you/Receipts filters once expenses exist. Filtering must
  not change the bill total; open rows for splits, notes, receipts and edit/remove.
- Empty bill: illustration, short copy and one first-expense action; omit search
  and filters. Keep balance/transfer/payment flows in Overview and Settle.

## Latest premium Expenses comparisons — Nov 4

- Three additional options lead `/design-system#expenses-premium`: Atelier
  (white editorial layout, oversized total, numbered rows/date groups), Amethyst
  (layered purple hero, personal share, payer initials/single white ledger) and
  The Collection (featured expense plus two-column card grid and bottom add action).
  The original three concepts remain directly below. All six retain the approved
  Helvetica/brand/control foundations and the shared sample interactions.
- All premium options have empty states. Amethyst/Collection show the total
  personal share independently of search/filters. No new direction is approved
  or applied to Screen 2. No hosted changes, migrations or deployment.
- Validation: the 17 affected browser checks pass, now exercising all six
  concepts across Chromium/WebKit/iPhone, axe in both states, 1280/393/320px,
  filtering/details and sample additions with return focus. Lint, formatting,
  diff checks and webpack build pass. Desktop/320px phone screenshots reviewed.

## Earlier Expenses page comparisons — Nov 4

- `/design-system#expenses-page` offers Daily ledger (date groups/daily totals),
  Spending snapshot (category summary/individual cards), and Receipt journal
  (paper entries/source details). No direction is approved or applied to Screen 2.
  Existing main-app create-bill form and approved foundations stay in place.
- Shared populated/empty toggle and reset; independent search, All/Paid by you/
  Receipts filters, expense-detail dialogs and sample additions through the shared
  Receipt spotlight chooser. Totals stay independent of filters. All sample data
  is session-local; no upload/provider/backend call. Decorative navigation only.
- New `expenses-showcase.jsx`/CSS plus studio section/jump link. The nine new
  browser checks cover Chromium/WebKit/iPhone, 1280/393/320px, axe in both states,
  filters/search, unchanged totals, details/focus, isolated additions and reset.
  All 17 new/affected studio checks pass; lint, formatting and webpack build pass.
  Existing foundations test now scopes its button to Controls because the gallery
  adds more Add expense controls. Desktop/phone populated/empty screenshots reviewed.
  No migration, hosted status refresh or deployment. Next: user chooses direction.

## Latest Screen 2 empty receipt animation — Nov 4

- The empty Recent expenses vignette now uses ReceiptArt's shared continuous
  7px/2.4-second float with steady lines (scan removed per user), retaining its existing
  two sheets, FileText icon, line lengths and layout. ReceiptArt accepts custom
  artwork so the chooser and vignette use one animation implementation/timing.
  The vignette explicitly disables scanning and has no line-animation hooks.
  Both sheets sit 8px lower within the card; text and action positions stay fixed.
- It stops behind drawers, pauses offscreen/in hidden tabs, and stays still for
  reduced motion. Adding an expense unmounts it. Chooser scanning stays unchanged.
- Validation: 18 existing Screen 2 entry/preview browser checks pass across
  Chromium/WebKit/iPhone emulation; direct Chromium/WebKit checks confirm float
  only, steady lines and reduced motion. Lint/formatting and the later gallery
  webpack build (including the float-only refinement) pass. No hosted changes.

## Latest Screen 2 chooser integration — Nov 4

- `/design-system#add-to-bill` compares four Add to the bill directions: Quiet
  list, Receipt spotlight, Equal tiles and Compact actions. The studio jump nav
  links to the gallery. Receipt spotlight is approved and now used in Screen 2;
  the other three remain comparison concepts. The four later premium pair
  experiments were removed at the user’s request.
- Each direction has a phone-sized specimen and a full-size interactive preview
  using the existing DialogPanel header, responsive positioning and motion.
  Choices announce sample-only feedback; they do not upload receipts, open real
  forms or write bill data. Escape, close and backdrop return focus to its trigger;
  the selected contents remain mounted during exit. Foundations stay unchanged.
- `bill-entry-choices.jsx` and its CSS module now supply BillEntryChoices to
  both Screen 2 and the studio. ReceiptArt shares that
  CSS; gallery-only layout stays in add-bill-showcase.module.css. Screen 2 opens
  its existing receipt picker or expense form, preserving drafts, history and
  return focus. The shared header holds the description; desktop add panels are
  460px wide and phone drawers keep full width. Closing stops receipt playback
  through the exit; each bill preview has independent motion. Screen 2 has only
  Close, Scan a receipt and Enter manually: animation toggles stay in the studio.
  No sample-preview status copy is shown in Screen 2. Keep the main create-bill
  form; real bill action integration remains the next feature phase.
  Integration validation: 56 browser checks pass across Chromium/WebKit/iPhone
  emulation (nine new entry checks plus 47 form/header/preview/studio regressions).
  Includes both bill presets, 1280/393/320px fit, a short viewport, plain hover
  surfaces, centered icons, motion cleanup/reduced motion, receipt/manual routing,
  draft retention, cleanup, independent frames and axe. Desktop/phone production
  smoke, lint, full formatting, diff checks and webpack build pass. Temporary
  production server stopped; no hosted data changed. Deployment status has not
  been refreshed as part of the local UI checks.
- Receipt spotlight floats continuously through a gentle 7px rise/return every
  2.4 seconds, independently of a scan pass every 4.5 seconds. There is no held
  position between passes: lavender light moves down the floating paper and
  briefly highlights its visible detail lines. Hover/activation do not restart
  either motion. `receipt-art.jsx` owns them; `receiptSpotlightTiming` separates
  `floatDuration` from the scan's `duration`.
- The larger 82×112px artwork (65px wide on narrow phones), separated back sheet,
  soft shadows, faint glow, steady card surface and centered manual icons remain.
  Forced colors hide the decorative scan light and glow.
- Pause/Play controls in the studio gallery and its preview drawer share one
  preference; Screen 2 intentionally has no animation control.
  Pausing or enabling reduced motion cancels the cycle and restores complete,
  still artwork; reduced motion disables playback controls. IntersectionObserver
  watches the stationary card and pauses when less than 25% is visible; hidden
  tabs pause too. Background specimens stop while a drawer is open. Visibility
  pauses retain their phase; user Play starts a fresh cycle. Observers/listeners
  and infinite Web Animations clean up on unmount. Other icons stay interaction-led.
  Chromium/WebKit checks verify continuous floating between the scan passes,
  scan/highlights, visibility pauses, user controls, reduced motion,
  modal isolation/cleanup, 1280/393/320px layout, actions, axe and backend isolation.
  Eight studio regressions, lint, full formatting, diff checks and webpack build pass.
- Receipt spotlight's Enter manually action now uses the official Animate UI
  PencilLine icon: a 500ms pencil lift and 300ms line draw after 120ms. Source,
  license and native animation definitions are retained under icons/. DesignButton
  exposes `pencil`, replaying on fresh pointer entry even while focused, plus its
  existing focus/click/keyboard/touch triggers. Reduced motion and specimens stay
  still. The pencil's background is now transparent, with its icon space retained;
  the other chooser directions retain Plus.
  Spotlight's manual row now renders the pencil at a true 22px (the shared 18px
  wrapper previously shrank it), paired with a 20px chevron at 1.8 stroke width.
  A three-column grid vertically centers both icons beside the title/subtitle
  text block. The 42px leading slot, labels, full-row target
  and both animations stay; the miniature specimen uses the same sizing/alignment.
  Manual entry stays background/border-free on hover and press as well as idle;
  it overrides the generic chooser hover fill/border. Keyboard focus stays visible.
  The receipt card also retains its resting lavender surface and pale border
  on hover/press, without the generic purple hover outline or extra fill.
  Its chevron now nudges right 3px and returns over 420ms on the same row's
  hover/focus/press/activation. It reuses AnimatedChoiceButton's replay and cleanup,
  stays still for reduced motion/specimens and preserves its outline and spacing.
  `drawerChevronTiming` controls the gesture separately from pencil/receipt timing.
  Chromium/WebKit checks pass for its measured nudge/settling, replay, keyboard
  Enter/Space, touch, cancellation, reduced motion, layout and receipt regression.
  Lint, full formatting, diff checks and webpack build pass.
  Pencil verification passes in Chromium/WebKit (measured lift and line drawing,
  focused-hover replay, keyboard/click/touch, reduced motion, axe and phone fit);
  eight shared button/copy tests, lint, formatting and webpack build pass.
- Validation: 48 drawer/viewport combinations pass in Chromium/WebKit at
  1280/1024/880/768/393/320px, including actions, Escape and focus restoration.
  Axe, reduced motion, X/backdrop dismissal, console and backend isolation pass;
  eight existing studio checks, lint, formatting and webpack build pass.
  Desktop/phone screenshots reviewed. No hosted status was refreshed.

## Earlier local UI refinement — Nov 4

- ReceiptText now adds paper lift in both Screen 2 and the shared design-system
  specimen. The whole SVG rises 1.5px, peaks at 40% of its 600ms gesture, and
  settles with ease-in-out while both lines retain their synchronized 550ms draw.
  The icon's dimensions and geometry stay intact; it does not rotate or overshoot.
  Initial/reduced-motion states stay at rest. The existing highlight-first gate,
  deselection cancellation and replay behavior are preserved. receiptLift in
  navigationIconTiming controls the height. This refinement follows checkpoint
  0a6f86f and is included with the approved Screen 2 chooser checkpoint.
  Validation: 15 targeted browser checks pass in Chromium/WebKit/iPhone, including
  measured lift/settling, synchronized strokes, replay, highlight sequencing and
  reduced motion. Lint, formatting, diff checks and webpack build pass.

## UI checkpoint and earlier refinements — Nov 3

- This checkpoint includes the approved people drawer, header alignment and
  Quiet bar refinements. README documents the current behavior;
  CURRENT_WORK stays under 50 lines. Continue design comparisons in /design-system,
  rather than creating separate HTML previews unless requested. Earlier people
  drawer/separation sketches remain in work/ as design references. Next feature
  work is real bill action integration; retain the existing create-bill form.
- Screen 2 now uses the approved Quiet bar in both independent bill previews
  and standalone pages. Shared BillNavigation is also the live Quiet bar specimen
  at /design-system#navigation; future changes should update this component.
  Floating dock/Compact capsule remain comparison concepts. Standalone navbar
  HTML files were removed per the user's preference for design-system previews.
  The flat opaque surface has three 64px targets, a 44×32px lavender icon chip,
  visible labels, and no full-tab fill, top divider, blur or floating shadow.
  Screen 2 retains its existing fixed positioning/desktop corners; phone layout
  respects the bottom safe area and reserves enough content space below the list.
- The highlight slides for 240ms and the chosen label lifts 1px/scales to 1.04
  with the same timing. Icons begin after the actual highlight transition finishes.
  The user restored navigationIconTiming.duration to 0.6 before this integration;
  preserve 600ms (their brief 300ms trial is superseded). House uses its door
  gesture, Expenses reveals receipt lines, and Wallet pulses once. Initial loads
  stay still, rapid selections discard pending playback, deselection resets the
  icon, and a later selection replays. Reduced motion suppresses these effects;
  forced colors outlines the chip and underlines the selected label.
- Expenses uses the official Lucide receipt-text outline with two centered detail
  lines in every navigation specimen and Screen 2. ReceiptText is a local Motion
  component with synchronized write-on after the highlight lands: both lines
  start together, draw at the same normalized pace, and finish together at 550ms.
  Both paths start at x=8 and draw left to right at full ink opacity; the outline
  geometry stays fixed. navigationIconTiming.receiptLineDuration controls both strokes;
  the cascade delay was removed. House/Wallet keep the 600ms duration token.
  Reduced motion and initial/resting states show both lines fully drawn.
  Animate UI receipt URLs returned 404;
  official Lucide SVG artwork and ISC license are recorded under icons/.
  Other icons reuse the unchanged Animate UI presets with normalized speed.
- Navigation integration checks cover both states at 1280/393/320px, independent
  frames, route history, heading focus/keyboard activation, fixed control bounds,
  chip size, animated sequencing/cancellation, reduced motion, forced colors and
  axe. Desktop/phone screenshots of both states were reviewed in Chromium and
  WebKit. The receipt-upload focus assertion raced once under concurrent checks,
  then passed alone and in the full offline suite with two workers; no code or
  test assertion was changed for that unrelated failure.
  Integration validation: 387 offline tests pass (eight hosted/provider checks skipped),
  24 shared-navigation checks plus 92 affected browser checks pass across the
  configured Chromium/WebKit/iPhone targets, and one additional Chromium check
  passes against the webpack production build. Lint, full formatting, diff checks
  and webpack build pass. The temporary production smoke server was stopped.
  Prior cascade validation: 27 affected navigation browser checks passed across
  Chromium/WebKit/iPhone; the stroke check samples actual progress on both
  /screen2 and /design-system and verifies direction, overlapping drawing, the
  top starting/finishing first, and complete resting lines. The current stroke
  check instead requires matching progress throughout and complete resting lines.
  Synchronized write-on: 12 targeted receipt/reduced-motion/sequence browser
  checks pass across Chromium/WebKit/iPhone. Lint/format/diff/webpack build pass.
- Overview eyebrow/title/subtitle now form one grid group with 8px vertical gaps.
  Eyebrow and subtitle span the full width; Share bill has its own column with a
  16px gap, centered on the first title line even when the title wraps. The action
  spans title/subtitle tracks so its 48px height does not stretch text spacing.
  Existing title sizes, visible Share bill label and stable copied-state width stay.
- Shared DialogPanel headers place the eyebrow above a title row, align the 48px
  close target to the title's first line and give the description the full width
  below with a 12px gap. Compact headers derive padding from the 20px title line
  to keep the close target inside the panel. Close-only keyboard focus is 2px with
  a 2px offset and Highlight in forced colors; other controls keep their focus style.
- Screen 2 people drawer now grows naturally for small groups and scrolls only
  the list at its viewport limit. Phone lists additionally cap at five standard
  70px rows; shorter viewports can scroll sooner and desktop remains height-based.
  The very-short-height shared scroller removes that cap to avoid nested scrolling.
  Title/close and participant count stay above; a solid footer holds the shared
  add/copy row. Desktop and both isolated comparison frames reuse it.
  The final person row stays borderless; the footer no longer has a divider.
- Footer actions now sit side by side: primary Add person fills remaining space;
  outlined Copy link is 114px wide with a 10px gap. During the 240ms morph, the
  field opens alongside separate 48px add and copy controls with 10px gaps.
  At 320px the field retains 146px. Reduced motion switches immediately.
  Helper/error/status text stays below; there is no separate invitation-button row.
- Soft feather now matches the approved preview: 24px footer padding above/below
  (bottom respects safe area), and a decorative 28px surface-color gradient at
  the list's bottom only when scrollHeight - clientHeight - scrollTop > 1px.
  It clears at the end or when everyone fits. Opacity transitions over 160ms;
  reduced motion is immediate and forced colors hide it. The opaque footer stays.
  PeopleList wraps its existing focusable ul in a positioned viewport; a passive
  scroll listener, row/list ResizeObserver and child-list MutationObserver update
  the flag through coalesced animation frames and clean up on close. The short
  shared-scroll fallback expands the wrapper and disables the feather.
- InlinePersonForm accepts a copyAction slot; DesignCopyButton adds optional
  iconOnly, aria-label and title props. One copy instance stays mounted through
  expansion, retaining pending writes and confirmation timing. Compact success
  shows the check/tint, politely announces Copied and resets after 1.8s. Keyboard
  copy never submits a name; clipboard failures retain the draft. Default copy
  callers keep their labels and behavior.
  Accessible naming now matches the collapsed visible Copy link text (Copy link
  to invite people), while compact mode keeps Copy invitation link. A full button
  showing Copied uses its visible success label as its name. Axe covers both states.
- Local submissions identify the created participant by UUID, follow its 240ms
  row expansion inside the list and retain field focus for repeated entry.
  Later submissions supersede earlier reveal requests; direct scrolling cancels
  following. External child updates preserve scrollTop; reopening starts at top.
  Draft restoration, name validation, focus trapping/return and reduced motion stay.
- Reopening people now starts a fresh entry session: an empty/whitespace-only
  field returns to Add person plus labeled Copy link; an unfinished name restores
  its original text and field focus. Successful saving stays expanded for repeat
  entry until the drawer closes. Only the form session remounts on reopening,
  clearing stale errors/status without replaying people rows. Closing retains the
  expanded form through exit. Legacy person links still open entry directly;
  rapid reopening applies the same empty-versus-draft rule.
- DialogPanel adds opt-in viewportAware sizing. visualViewport resize/scroll
  events fit the drawer above the keyboard; dynamic viewport units are the fallback.
  At 480px or shorter the header compacts. If a count and one row cannot fit with
  the pinned footer, contents share one scroll area below the fixed header and
  the field/error is revealed. Observers, frames and event listeners clean up.
- The scrollable list has keyboard focus and a visible focus outline; long names
  wrap. Real-phone keyboard behavior still requires device confirmation. This is
  local prototype work; live participant synchronization belongs to integration.
- Validation: 387 offline tests pass with `npm test -- --maxWorkers=4`; eight
  hosted/provider checks skipped. Three PeopleList component checks cover the
  one-pixel boundary, external content/size changes, reader position and cleanup.
  All 84 affected header/form/preview/people browser checks pass across Chromium,
  WebKit and iPhone emulation. Includes one/five/overflowing people, scroll-end
  feather visibility, wheel/keyboard scrolling and emulated touch hit testing,
  resizing, reduced motion and Chromium forced colors, long names, animated
  additions, keyboard viewport/fallback, copy success/failure/pending expansion,
  drafts and empty-entry reset through X/Escape/backdrop/Back, rapid reopening,
  legacy links, focus, independent comparison frames and axe.
  Header checks cover first-line alignment, 8px overview spacing, full-width
  descriptions, wrapped titles, unchanged geometry during Share bill confirmation,
  48px close targets/2px focus rings, compact height, chooser/expense/confirmation/
  studio variants and idle/copied accessible names.
  Test opening waits for initial route focus before scrolling an offscreen trigger.
  Small-group, overflow and end-of-list screenshots reviewed at desktop, 393px
  and 320px in Chromium plus 393px WebKit; short shared-scroll fallback reviewed.
  Revised overview/drawer headers reviewed at 1280/393/320px in Chromium and
  393px WebKit, including the 320px/230px compact WebKit drawer.
  Lint, formatting and webpack build pass; source-map uploads disabled locally.
  Hosted data, operational evidence and migrations were not changed; deployment
  status has not been refreshed as part of these local UI checks.

## Previous local UI work — Nov 1

- `/screen2` compares populated and empty bills side by side, stacking on narrow
  screens. **Open preview** opens `/screen2?preview=populated` or `?preview=empty`.
  Independent frames isolate local data, focus, dialogs and navigation. Embedded
  navigation uses a React back stack and replaces its hash, so one preview cannot
  traverse the other preview's history.
- The empty preset starts with Nary only, $0 totals, no ledger/activity and no QR.
  User chose **Receipt vignette**: two CSS paper shapes, **A little receipt. A lot
  less math.**, short copy and a tertiary **Add expense** action. That action stays
  background-free on hover. Activity uses a compact clock/message line. Adding
  entries and resetting swap these states locally; drafts use actual participants.
  Decorative file-text/clock-3 icons are official Animate UI sources; provenance
  is in the icons README. The comparison artifact is `work/empty-state-directions.html`.
- Full expense forms share `bill-form-dialogs.jsx` and `form-dialog.jsx` with
  `/design-system#forms`, which retains a standalone quick-person example.
  Expense entry/editing includes description/amount, person picker, calendar,
  participant checks, equal/exact
  splits, precise share preview, category and notes. Validation focuses errors.
  X/Escape/backdrop preserve drafts. Expense and studio person-form footers have
  one primary action, with no Cancel; confirmation keeps its safe dismissal action.
- All Screen 2 menus, the first **Add to the bill** chooser and forms now use
  `DialogPanel`: bottom drawers on phones, centered panels on desktop, compact
  centered confirmations, scrollable bodies and visible form footers. Entrance
  is 240ms and exit 140ms; reduced motion is immediate. Outgoing menu contents
  stay mounted through exit and cannot intercept pointers. The initial chooser's
  old instant shell was caught and replaced after the full-form rollout.
- People management now uses one drawer: **Add person** transforms in place into
  an outlined name field with a compact purple **+** submit button. The shared
  surface fades from purple as the row makes room for the 48px action, with helper
  text revealed below. Motion is 240ms; reduced motion switches immediately.
  The people list and invitation link stay in the same panel. Saving
  adds the person without navigating, clears/refocuses the field for another
  name and announces success. Empty/duplicate names are rejected. Closing keeps
  the unfinished name; reopening restores entry. The overview subtitle now says
  **Add names or share an invitation link**. Legacy `#overview/person` links open
  the inline form. Existing `#new` links open expense entry; receipt review stays
  full screen. New local IDs use UUIDs.
- Newly added people now reuse the motion playground's list-entry recipe:
  `AnimatePresence initial={false}`, position layout, opacity/height 0 to 1/auto,
  shared 240ms reveal timing/easing. Existing rows do not replay on drawer open;
  reduced motion is immediate. The 70px row content sits inside the clipped
  animated list item so minimum height does not prevent expansion from zero.
  Row follow-up validation: 15 affected browser checks pass across Chromium,
  WebKit and iPhone emulation, including timed height/opacity samples, rapid
  additions, no replay on reopen, reduced motion, retained drafts and settled axe.
  Screenshots/bounds reviewed at desktop, 393px and 320px/480px. 381 offline tests
  pass, eight hosted/provider tests skipped; lint/format/webpack build pass.
- Shared primary/secondary buttons use subtle top lighting and lower shadows.
  Purple uses a diffused 6% white fade; the user rejected a hard curved inset.
  Outlined hover lighting follows the tint. People/activity cards use white top
  insets and soft lavender shadows. Copy controls center complete icon/label pairs
  with stable widths (6px gap on Screen 2, 8px elsewhere).
- Balance-card glass actions retain their single border and `box-shadow: none`,
  including hover. The user rejected a doubled top edge. Standard controls retain
  shared lighting, 48px height and 22px corners. The receipt file picker uses the
  shared upload-icon button with native keyboard file selection.
- Validation: 381 offline tests pass; eight hosted/provider checks skipped.
  41 studio/Screen 2 browser checks passed across Chromium/WebKit/iPhone, followed
  by three final Add person flow checks. Coverage includes independent frames,
  reset/add/edit, exact splits, retained drafts, error focus, nested pickers,
  animated entrance/exit/focus return, timestamp/timezones, reflow and axe.
  Final button inspection confirms purple/white colors, 48px height and aligned
  icon/label. Screenshots reviewed; lint/format/webpack build pass. Source-map
  uploads were disabled for the build. Use `PLAYWRIGHT_BASE_URL=http://localhost:3000`;
  this computer's server did not hydrate scripts correctly on 127.0.0.1.
- Inline people follow-up: 381 offline tests pass, eight hosted/provider tests
  skipped; 36 affected form/preview/activity browser checks pass across Chromium,
  WebKit and iPhone emulation. Checks cover one unchanged dialog/URL, validation,
  draft retention, repeat entry, focus, activity, axe, the 240ms morph and immediate
  reduced-motion behavior. Desktop, 393px phone and 320px short-viewport screenshots
  reviewed in Chromium/WebKit; bounds pass.
  Lint, formatting and webpack build pass with source-map uploads disabled.
- Continue UI review as requested, then integrate the polished prototype with
  real bill actions. Keep the existing main-app create-bill form. Hosted data,
  migrations, provider/operational evidence and the retained fixture were not
  changed; deployed runtime status has not been reverified.

## Previous local UI work — Oct 31

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
  their subsequent `/screen2` rollout is documented in the Nov 1 section above.
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
