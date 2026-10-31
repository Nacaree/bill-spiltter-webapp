# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Polish /screen2, then integrate bill functionality; keep the create-bill form.
Screen2 now uses the approved 8/3/3 contour clusters with a 9-second drift.
Forms at /design-system#forms; review before applying to /screen2 drawers; see HANDOFF.
User owns remaining real-device/screen-reader/full keyboard/Firefox checks.
Stage 2 skipped; Stage 3 migration user-reported applied; Stage 5 readiness done.

## Latest hosted evidence (Oct 25; not refreshed)

- Last verified Ready Production HYZYcPFFE / 876c22f; runtime matches eec047e.
- Original 13 jobs previously verified gone. Now all six Stage 6 jobs also gone;
  their six exact bucket prefixes empty. No manual cleanup or deadline edits.
- Three later jobs were pending: due since Oct 25 15:42, attempts=1, unleased.
  First scheduled opportunity was Oct 26 03:00–03:59 GMT+7; follow-up remains open.
- Retained synthetic bill/receipt active, confirmed, attempt_count=1, same one $12
  expense ID. Stored image 59,685 bytes; SHA-256 EXACT match to Oct 24 baseline.
- Fresh incognito page visibly showed Receipt confirmed + actual Uploaded receipt;
  no missing-image fallback or reconfirmation controls. No join/provider call.
  Normal-session content was blank; its owner-session recheck is not claimed passed.
- Totals unchanged: 20 bills / 9 confirmed receipts / 11 expenses including fixture
  Stage 4 retained image synthetic 2026-10-24. Original baseline minus fixture 19/8/10.
- KEEP fixture active for Oct 26 follow-up. IDs/hash/evidence in HANDOFF;
  local report /private/tmp/stage4-followup-2026-10-25.json.
- Exact cron time/aggregate log not recovered: prior Vercel log window only 1h;
  later browser-control timeout blocked fresh dashboard check. Source not proven
  by queue outcome alone. No new automation/reminder scheduled.
- Sentry last rechecked Oct 24: BILL-SPLITTER-WEBAPP-7 one event, unresolved;
  no recurrence/cleanup issue then. Not rechecked Oct 25; incident stays open.

## Remaining / closeout

- Verify three later sweeps after Oct 26 daily run; retain/reopen fixture again,
  then delete only it via lifecycle and record its normal future final sweeps.
- Direct scheduled invocation/result remains separate missing evidence. Daytime
  queue/hash/UI verification is valid even when the detailed log window is missed.
- User records manual/device outcomes before Stage 7 signoff; Phase 4 remains open.
- Collect safe provider HTTP status/classification on recurrence; no proven fix.
- Local UI work changes /screen2 and design-system previews, with no hosted-data
  writes or migrations. Hosted deployment/cleanup status has not been refreshed.
- Oct 31: 363 offline tests pass, 8 hosted skipped; contour checks pass
  in Chromium/WebKit (prior 9 timestamp checks pass). Lint/format/build/axe pass.
- Preview shares Production; no isolated backend. QR-orphan retry limit remains.
  Privacy/Help content stays off to-do list.
