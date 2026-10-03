# Transactions, analytics, settings, profile, and resilient states

## Goal
Expand the existing MANDATE control center with complete operational, account, and configuration surfaces while preserving its living-vault design, deterministic demo behavior, and fast single-route navigation.

## What will be built

### Transactions
- Add a PayPal Sandbox transaction workspace with searchable/filterable payments, semantic status chips, amounts, merchants, dates, and order references.
- Add a transaction detail drawer showing lifecycle, policy decision, mandate, payment metadata, and refund history.
- Add guarded full/partial refund dialogs with validation, confirmation, loading, success, and updated row states.

### Analytics
- Add spend trend and category charts, approval-rate and decision-time metrics, and time-range controls.
- Add a day/hour blocked-attempt heatmap with accessible intensity labels and tooltips.
- Keep chart colors mapped to MANDATE’s semantic tokens and readable in both themes.

### Settings
- Build tabs for General, Agent, Notifications, Security, Integrations, Appearance, and Data & Privacy.
- Include the requested selectors, permission toggles, autonomy/intensity sliders, quiet hours, 2FA setup UI, sessions, API-key management, kill-switch rules, PayPal Sandbox/webhook status, theme/accent/density controls, and export/delete actions.
- Make settings interactive in the demo, with confirmations and feedback for sensitive actions; never expose real secret values.

### Profile
- Add avatar selection with an in-app crop/zoom preview, editable identity/localization fields, plan and usage cards, activity summary, connected accounts, and a guarded danger zone.
- Use local preview state for edits and destructive flows; existing account identity remains authoritative.

### Chat settings
- Add a settings drawer reachable from Agent Chat.
- Include model, creativity, response style, read-only system prompt, search/compare/purchase permissions, memory toggle, and clear-memory confirmation.
- Keep these controls scoped to the active chat experience and visibly reflected in its settings summary.

### Resilient states
- Add route-level not-found and error screens matching the MANDATE visual system.
- Add reusable illustrated empty states and skeleton loaders, then apply them to each new screen and the major existing operational screens where data can be absent or loading.
- Every empty state will have a relevant recovery or creation action.

## Navigation and responsive behavior
- Extend the current sidebar and command palette with Transactions, Analytics, Settings, and Profile rather than adding another shell.
- Keep dense tables horizontally usable on small screens; convert complex account/settings areas into stacked layouts.
- Support keyboard focus, reduced motion, touch-sized actions, and light/dark themes throughout.

## Technical details
- Implement feature modules beside the existing dashboard modules and compose them through the current `MandateApp` view system.
- Use existing design-system controls, Recharts, Motion, and semantic CSS variables; add no new backend schema.
- Use deterministic mock records and local component state for payments, refunds, analytics, settings, and profile demos until live commerce/account services are connected.
- Add real TanStack not-found/error handling without changing the protected route boundary.
- Validate with lint, strict type checking, tests, current build telemetry, and responsive browser checks where authentication permits.

## Completion checks
- Each new navigation destination opens and its central interactions work.
- Refund, API-key, session, memory, data deletion, and profile danger actions require confirmation.
- Charts, heatmap, drawers, tabs, loaders, and empty states remain legible on desktop and mobile in both themes.
- Existing dashboard, chat, mandates, approvals, audit, and red-team behavior remains intact.
