# MANDATE

MANDATE is a trust and spending-control layer for AI shopping agents. Users define a mandate in plain English; a deterministic policy layer approves, escalates, or blocks each proposal and records the reason.

The application is a complete TanStack Start + React frontend with Lovable Cloud authentication and account-scoped chat history. Operational commerce data runs against deterministic local fixtures by default, so the dashboard, mandate simulator, approvals, transactions, analytics, audit ledger, and red-team lab are reproducible without a commerce backend.

## Quick start

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. The default development port is normally `3000`; hosted previews may select another port automatically.

## Environment variables

| Variable                        | Required             | Purpose                                                                                                             |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_USE_MOCKS`                | No                   | Defaults to `true`. Set to `false` only after connecting a commerce service that implements the typed API contract. |
| `VITE_SUPABASE_URL`             | For account features | Lovable Cloud API URL. It is provided automatically in Lovable-hosted environments.                                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | For account features | Browser-safe Lovable Cloud key. It is provided automatically in Lovable-hosted environments.                        |
| `LOVABLE_API_KEY`               | For live Agent Chat  | Server-only key used by the streaming AI route. Never expose it with a `VITE_` prefix.                              |

The approvals and PayPal screens are sandbox simulations; they never move real funds and do not require PayPal credentials in mock mode.

## Scripts

| Command              | Purpose                              |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the local development server.  |
| `npm run build`      | Build the production application.    |
| `npm run preview`    | Serve the production build locally.  |
| `npm run typecheck`  | Run strict TypeScript checks.        |
| `npm run lint`       | Run ESLint.                          |
| `npm run format`     | Format the repository with Prettier. |
| `npm test`           | Run the Vitest suite once.           |
| `npm run test:watch` | Run Vitest in watch mode.            |

## Architecture

- **Routes:** TanStack Router file routes live in `src/routes`. Public acquisition, account access, onboarding, and the protected workspace are separate route boundaries.
- **Workspace:** `src/features/mandate/MandateApp.tsx` provides one control-center shell with fast in-place feature switching. Secondary screens and charts are lazy-loaded.
- **Data:** `src/features/mandate/api.ts` is the typed operational API boundary. `src/features/mandate/mock.ts` contains 12 products, 12 purchase proposals, 240 audit events, six attack scenarios, activity, and chart fixtures. `src/features/mandate/store.ts` holds optimistic local mandate and approval state.
- **Policy behavior:** Demo verdicts are deterministic. Identical fixture inputs always produce identical APPROVE, ESCALATE, or BLOCK outcomes.
- **Chat:** `src/routes/api/chat.ts` streams responses from the server. Threads and messages are account-owned and saved in Lovable Cloud; schema and access policies live in `drizzle/migrations/0001_create_agent_chat_history.sql`.
- **Account setup:** Profiles and onboarding state are defined in `drizzle/migrations/0000_create_user_profiles.sql`.
- **Errors and states:** The root route supplies the global error and not-found boundaries; feature-level skeletons and empty states live in `WorkspaceStates.tsx`.

## Project structure

```text
.
├── drizzle/
│   ├── migrations/                 # Profile and chat-history schema
│   └── schema.ts
├── public/                         # Static public assets
├── src/
│   ├── assets/                     # Local product imagery
│   ├── components/
│   │   ├── ai-elements/            # Chat message, prompt, tool, and code primitives
│   │   ├── ui/                     # Customized accessible UI primitives
│   │   └── Brand.tsx
│   ├── features/
│   │   ├── auth/                   # Sign in, sign up, recovery
│   │   ├── marketing/              # Public landing page
│   │   ├── onboarding/             # Three-step account setup
│   │   └── mandate/                # Complete protected control center
│   ├── integrations/               # Generated Lovable Cloud clients
│   ├── lib/ai/                     # Streaming agent implementation
│   ├── routes/                     # File-based pages and server API routes
│   ├── test/                       # Routing test and test setup
│   ├── router.tsx                  # Query-aware router creation
│   ├── start.ts                    # Client/server function middleware
│   └── styles.css                  # Tailwind v4 configuration and design tokens
├── .env.example
├── components.json                 # UI primitive configuration
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

`src/routeTree.gen.ts`, generated integration clients, dependencies, and build output should not be edited manually.

## Design system and Tailwind

This project uses Tailwind CSS v4, so there is intentionally no legacy `tailwind.config.js`. Tailwind configuration, semantic tokens, font families, radius scale, shadows, verdict colors, theme values, and reusable visual utilities are defined in `src/styles.css` through `@theme` and CSS custom properties.

Key token families:

- Surfaces: `background`, `card`, `popover`, `vault`, and `vault-raised`
- Structure: `border`, `input`, `ring`, `vault-line`, and sidebar tokens
- Verdicts: `safe` (APPROVE), `warning` (ESCALATE), and `danger` (BLOCK)
- Brand and flow: `signal`, `gate`, `flow-node`, `flow-gate`, and `--brand-gradient`
- Typography: Inter for UI, Space Grotesk for display, and JetBrains Mono for amounts, IDs, and rules

Change token values in the `:root` and `.dark` blocks rather than adding hard-coded colors to feature components.

## Build order and component map

All requested phases are implemented:

1. **Design system + shell** — `src/styles.css`, `src/components/ui/*`, `src/components/Brand.tsx`, and the shell/navigation in `src/features/mandate/MandateApp.tsx`.
2. **Intro + background** — `MandateIntro.tsx` owns the GSAP first-visit sequence; `TransactionFlowBackground.tsx` owns the adaptive Canvas 2D flow field; animation keyframes and glow utilities are in `src/styles.css`.
3. **Landing + auth + onboarding** — `LandingPage.tsx`, `AuthPage.tsx`, `ResetPasswordPage.tsx`, and `OnboardingPage.tsx` with their route files under `src/routes`.
4. **Agent Chat + verdict cards** — `AgentChat`, `ChatSession`, and `ProductProposal` in `MandateApp.tsx`; reusable chat primitives in `src/components/ai-elements`; streaming server logic in `src/lib/ai/chat.server.ts`.
5. **Mandate Builder** — `MandateBuilder` in `MandateApp.tsx`, with deterministic local state in `store.ts`.
6. **Approvals + Audit + Red-Team Lab** — `Approvals` in `MandateApp.tsx`, plus `AuditLog.tsx`, `RedTeamLab.tsx`, and shared `VerdictBadge.tsx`.
7. **Dashboard + Analytics + Transactions** — `Dashboard` in `MandateApp.tsx`, lazy chart modules in `DashboardCharts.tsx`, and complete screens in `Analytics.tsx` and `Transactions.tsx`.
8. **Settings + Profile + chatbot settings** — `Settings.tsx`, `Profile.tsx`, and `ChatSettingsDrawer.tsx`.
9. **Accessibility + performance + responsive polish** — `WorkspaceStates.tsx`, responsive shell and approval layouts in `MandateApp.tsx`, reduced-motion rules in `styles.css`, adaptive Canvas fallbacks, lazy secondary modules, stable image dimensions, live announcements, focus rings, and icon-plus-text verdicts.

### Animation tuning guide

- Intro timing, particle choreography, skip delay, and session persistence: `src/features/mandate/MandateIntro.tsx`
- Background particle count, frame cap, parallax, gate spacing, and capability fallback: `src/features/mandate/TransactionFlowBackground.tsx`
- CSS keyframes, glows, flow mesh, and reduced-motion override: `src/styles.css`
- Landing scroll reveals and live verdict stream: `src/features/marketing/LandingPage.tsx`
- Workspace transitions and interaction motion: `src/features/mandate/MandateApp.tsx`

## Mock API and seed data

Import `mandateApi` from `src/features/mandate/api.ts`. It exposes one contract for activity, audit events, products, proposals, red-team scenarios, and spend series. Mock mode is enabled unless `VITE_USE_MOCKS=false`.

The seeded contracts are exported from `src/features/mandate/mock.ts`:

- `Mandate`
- `Product`
- `PurchaseProposal`
- `AuditEvent` and `AuditRecord`
- `Verdict`

To connect a real commerce service, implement the `MandateApi` interface in `api.ts`, select it when mock mode is disabled, and leave components consuming the stable contract unchanged.

## Verification

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The public landing, account access, branded error state, responsive layouts, keyboard focus, reduced motion, and deterministic workflows are included. Signed-in workspace checks require an account in the connected Lovable Cloud project.
