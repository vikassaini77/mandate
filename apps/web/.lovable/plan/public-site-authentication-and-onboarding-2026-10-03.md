# Public site, authentication, and onboarding

## Goal
Add a premium public MANDATE site, secure account access, and a three-step first-run setup while preserving the existing control center.

## Build
- Move the current control center to the protected `/dashboard` experience.
- Build `/` as a polished public page with an animated verdict demonstration, product story, four-step flow, security, live metrics, FAQ, and footer.
- Build `/auth` with sign in, sign up, forgot-password states, validation, loading/errors, Google sign-in, and password strength feedback.
- Add the required public `/reset-password` flow.
- Build protected `/onboarding` for PayPal Sandbox connection, first mandate creation, and agent persona selection.
- Store each user’s display name, PayPal connection status, persona, first mandate, and onboarding completion in a private profile.
- Keep the existing deterministic mock policy and PayPal Sandbox behavior.

## Technical details
- Use Lovable Cloud email/password and managed Google authentication.
- Protect dashboard and onboarding with the generated account gate and user-scoped database policies.
- Preserve one control-center module for fast tab switching.
- Add route-specific metadata, accessible states, reduced-motion support, and responsive verification.
