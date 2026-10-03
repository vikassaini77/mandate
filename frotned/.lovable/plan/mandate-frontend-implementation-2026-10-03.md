# MANDATE frontend implementation

## Goal
Build a complete premium fintech control center for AI shopping mandates, adapted to the project’s supported TanStack React stack.

## Scope
- Replace the placeholder with a polished application shell and dashboard.
- Add an animated brand introduction, mandate composer, policy decision simulation, approval queue, transaction ledger, and spend analytics.
- Implement realistic mock data and client-side interactions so every core flow works without a backend.
- Add focused state management, validation, charts, toasts, and motion while keeping the experience responsive and accessible.
- Create app-specific metadata and preserve the existing route architecture.

## Technical approach
- Use Tailwind v4 semantic tokens and customized reusable controls.
- Use Zustand for mandate and approval state, TanStack Query for mock activity, Zod with react-hook-form for validation, Recharts for analytics, Motion for transitions, and GSAP for the intro sequence.
- Keep payment approval as a clearly labeled PayPal Sandbox simulation because no payment backend or credentials were requested.
- Verify the main create-mandate and approve/block flows in the running preview across desktop and mobile.
