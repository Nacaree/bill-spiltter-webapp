# Icon sources

The design reference compares real icon components from both libraries, using
their default animation definitions and a shared interaction wrapper.

- **Animate UI:** `@animate-ui/react` 2.3.0 provides the official icon runtime.
  Check, copy and upload components were fetched from
  `https://animate-ui.com/r/icons-lucide-{name}.json` on October 26, 2026.
  Original license: [MIT + Commons Clause](animate-ui/LICENSE.txt).
- **Additional Animate UI button icons:** plus, arrow-right, x, and rotate-ccw
  were fetched from `https://animate-ui.com/r/icons-lucide-{name}.json` on
  October 29, 2026. The same license applies. TypeScript annotations were removed;
  the original SVG paths, variants, and animation timings are preserved.
- **Mobile navigation icons:** house, wallet, users, and ellipsis were fetched
  from the same official Animate UI registry on October 29, 2026, with the same
  license and TypeScript-only adaptations.
- **Expense category icons:** coffee, route, shopping-bag, and tag were fetched
  from the official Animate UI registry on October 29, 2026. They use the same
  license and TypeScript-only adaptation. The design-system expense/receipt cards
  use their native steam/draw presets on view entry, card hover, focus and press
  through `ExpenseCategoryIcon`. Playback stops offscreen, on hidden pages or
  open dialogs, and with reduced motion or forced colors; gestures preserve the
  pressed SVG and replay without a continuous idle loop.
- **Expanded expense categories (November 6, 2026):** cross and gift were fetched
  from `https://animate-ui.com/r/icons-lucide-{name}.json`, retaining their native
  presets and the same TypeScript-only adaptation/license. The official catalog
  does not provide the other nine requested shapes. `expense-categories.jsx`
  uses utensils, shopping-basket, car, fuel, wine, bed-double, ticket, plane and
  plug SVGs from `https://github.com/lucide-icons/lucide/tree/main/icons`, with
  local 700ms Motion presets via the Animate UI runtime. These are local motion
  adaptations, not official Animate UI presets. Lucide's ISC/Feather MIT license
  is preserved in [lucide-LICENSE.txt](lucide-LICENSE.txt). Coffee, ShoppingBag,
  House and Tag reuse the existing official components. The complete set maps
  through `expense-categories.js`, with unknown categories falling back to Tag.
- **Name-aware transport (November 6, 2026):** TukTuk and Motorbike in
  `expense-categories.jsx` are original vector drawings on the same 24px grid,
  with rounded 2px strokes and local 700ms ride motion through the Animate UI
  runtime. They are not downloaded Lucide or official Animate UI geometries.
  Transport descriptions choose between these drawings and the existing Car;
  the 15 category choices stay the same.
- **Empty-state icons:** file-text and clock-3 were fetched from the official
  Animate UI registry on November 1, 2026. They use the same license and
  TypeScript-only adaptation. The receipt vignette and empty activity line
  keep these decorative icons still.
- **No expenses found (November 11, 2026):** the user selected Tabler's outline
  `zoom-question` from the sourced options. `ExpenseNotFoundArt` preserves its
  four original paths and rounded 2px stroke from
  `https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/zoom-question.svg`.
  It is scaled into the existing 140×112 frame in brand purple and uses the
  shared `ReceiptArt` float. [MIT license](tabler-LICENSE.txt).
- **Manual-entry pencil:** pencil-line was fetched from the official Animate UI
  registry at `https://animate-ui.com/r/icons-lucide-pencil-line.json` on
  November 4, 2026. The same license and TypeScript-only adaptation apply.
  Receipt spotlight uses its unchanged 500ms pencil lift and 300ms line draw
  (120ms delay), triggered through DesignButton on hover, focus, click and touch.
  Fresh pointer entry replays it even while focused; reduced motion stays still.
- **Search:** search was fetched from the official Animate UI registry at
  `https://animate-ui.com/r/icons-lucide-search.json` on November 6, 2026.
  TypeScript annotations were removed with esbuild; its Lucide geometry,
  variants and timing definitions are unchanged. The shared search control
  retains Animate UI's built-in `path` draw preset (800ms) in its comparisons.
  The approved borderless variant uses `search-trace.jsx`: the same 8px lens and
  handle geometry with a staged reveal. Custom Motion playback draws the circle
  over 280ms, then reveals and draws the handle outward over 120ms. The lens
  starts at its lower-right junction; both strokes remain complete at rest.
  This is a local animation adaptation, separate from
  the preserved library presets. Replays never replace the pressed SVG, and
  reduced motion shows the complete icon. The same license applies.
- **Lucide Animated:** check, copy and upload components were fetched from
  `https://lucide-animated.com/r/{name}.json` on October 26, 2026.
  Original license: [MIT](lucide-animated/LICENSE.txt).
- **Expenses receipt:** the official Lucide `receipt-text` SVG was fetched from
  `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/receipt-text.svg`
  on November 3, 2026. [ISC license](lucide-LICENSE.txt). Its outline is preserved;
  two detail lines are spaced centrally. The local ReceiptText component adds a
  synchronized write-on with Motion and honors reduced motion. Both lines draw
  left to right over 550ms, starting and finishing together at the same pace.
  The whole icon lifts 1.5px and settles over 600ms while its shape stays intact;
  the strokes use full ink opacity. This is a
  custom animation, separate from the unchanged library animation definitions.

Adaptations: TypeScript annotations were removed with esbuild, files are formatted
with the project formatter, and Lucide's `@/lib/utils` import points to the existing
`@/lib/cn` utility. Animation definitions are unchanged. Both use Motion 14.6.0.

The comparison wrapper adds keyboard/touch triggers, synchronized replay and
reduced-motion handling. Circular checkbox styling is our shared design-system
control; its tick uses the selected library. Icons are decorative; the surrounding
buttons and native checkbox inputs provide names, focus and semantics.

Animate UI icons are shared by the design-system and app buttons through
`DesignButton`. The button triggers their native animations on hover, focus,
click, keyboard activation, and touch, while honoring reduced motion. The copy
button uses the Animate UI Copy icon and switches to its Check icon after a
successful clipboard write. Copy buttons use the library's `merge-loop` preset
and replay on each pointer entry, including when the button retains focus.
Button-surface compression and the copy confirmation
highlight are separate from the library's icon motion.

Lucide Animated icons remain only in the explicit comparison previews.
