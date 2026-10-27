# Preview icon sources

The design reference compares real icon components from both libraries, using
their default animation definitions and a shared interaction wrapper.

- **Animate UI:** `@animate-ui/react` 2.3.0 provides the official icon runtime.
  Check, copy and upload components were fetched from
  `https://animate-ui.com/r/icons-lucide-{name}.json` on October 26, 2026.
  Original license: [MIT + Commons Clause](animate-ui/LICENSE.txt).
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

These components are currently imported only by the development reference page.
