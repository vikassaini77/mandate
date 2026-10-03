# MANDATE Quality Hardening

## Goal
Bring the existing MANDATE experience to the requested production-quality bar across accessibility, responsive behavior, performance, resilient states, and maintainability without changing its visual direction or product scope.

## Implementation

### 1. Accessibility and interaction quality
- Audit public, account, onboarding, and protected workspace surfaces for keyboard access, labels, landmarks, heading order, focus visibility, and reduced motion.
- Make primary mobile controls and icon buttons meet 44px touch targets while preserving compact desktop density.
- Add an icon alongside text to every verdict treatment so approve, escalate, and block never rely on color alone.
- Add polite live announcements for streaming, policy decisions, approval outcomes, loading, and form success states where updates currently appear silently.
- Replace remaining hand-built interactive controls with existing button primitives where practical.

### 2. Responsive workspace and mobile approvals
- Harden multi-item headers with stable grid/flex constraints, truncation, and fixed-size controls at narrow widths.
- Refine approval cards for thumb reach, clear monetary hierarchy, non-overlapping countdown/status content, and full-width primary approval actions on mobile.
- Check tables, drawers, dialogs, settings tabs, charts, chat history, and profile controls at mobile, tablet, desktop, and wide desktop sizes.

### 3. Performance and visual stability
- Lazy-load heavier protected feature modules and keep skeleton fallbacks consistent during transitions.
- Keep the Canvas background behind capability/reduced-motion safeguards and avoid loading it before the protected workspace needs it.
- Preserve explicit image dimensions/aspect ratios and responsive sizing to prevent layout shift; use the Vite/TanStack equivalent of optimized bundled assets because Next Image is not available in this stack.
- Measure the public page with Lighthouse and address actionable accessibility, performance, and layout-shift findings toward 90+ scores.

### 4. Resilient states and architecture
- Reuse the existing workspace state primitives for loading, empty, and error cases rather than adding one-off treatments.
- Add or refine optimistic feedback only where rollback is deterministic, including approvals and safe local settings actions.
- Reduce duplicated verdict/status styling into shared typed primitives and keep feature data/contracts centralized.
- Preserve the global error boundary and verify route-level failures remain recoverable.

### 5. Verification
- Run TypeScript, ESLint, formatting checks, and tests with zero errors.
- Exercise public routes in Playwright with keyboard navigation and reduced motion, checking console/runtime errors.
- Verify protected screens with an authenticated session if one is available; otherwise document that signed-in visual verification remains blocked by the lack of a test account.
- Capture desktop, tablet, and mobile screenshots and complete every unblocked roadmap item.

## Technical notes
- Keep TanStack Start routing and file-based route code splitting; do not introduce Next.js-only APIs.
- Use semantic design tokens and existing shadcn/Radix primitives.
- Preserve deterministic mock policy behavior and account-scoped chat storage.