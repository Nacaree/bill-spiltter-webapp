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
  license and TypeScript-only adaptation; category icons animate on row hover
  and keyboard focus, with reduced-motion support.
- **Lucide Animated:** check, copy and upload components were fetched from
  `https://lucide-animated.com/r/{name}.json` on October 26, 2026.
  Original license: [MIT](lucide-animated/LICENSE.txt).

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
