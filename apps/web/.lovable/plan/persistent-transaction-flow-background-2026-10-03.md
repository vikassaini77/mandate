# Persistent transaction-flow background

## Goal
Add a subtle, theme-aware animated canvas behind MANDATE that visualizes transactions crossing policy gates without reducing dashboard readability.

## Scope
- Create a fixed, pointer-transparent canvas layer with slow left-to-right luminous nodes and vertical policy gates.
- Flash verdict colors when nodes cross gates: emerald for approve, amber for escalate, and rose for block.
- Add restrained mouse parallax and lower animation intensity on the Overview and Activity views.
- Pause rendering while the tab is hidden, cap rendering at 60fps, and scale node count to viewport/device capability.
- Use a static token-based gradient mesh for reduced-motion or likely low-power devices.
- Keep the layer theme-aware and place all app content above it without changing existing workflows.
- Verify dark/light rendering, motion fallback, desktop/mobile sizing, and current app interactions.

## Technical details
- Implement the effect with the browser Canvas 2D API and `requestAnimationFrame`, isolated in a client-safe React component.
- Detect reduced motion, conservative device capability, visibility changes, resizing, and pointer movement inside effects only.
- Pass the active view into the background to select standard or reduced density.
- Add semantic background tokens and fallback styling in the global design system.
