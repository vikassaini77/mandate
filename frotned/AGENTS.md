<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep MANDATE as a single control-center route with feature modules; this preserves fast tab switching for operational workflows.
- Keep policy evaluation deterministic and mock-backed until a real commerce service is connected; this makes every demo state reproducible.
- Keep ambient visualization in the isolated Canvas 2D background module with capability fallbacks; this protects control-center responsiveness and readability.
- Keep public acquisition, account access, onboarding, and the protected control center as separate routes; this preserves clear security and navigation boundaries.
- Store Agent Chat as account-scoped threads and messages with route-derived thread IDs; this prevents conversation bleed and restores history across devices.
- Lazy-load chart and secondary workspace modules inside the single control-center route; this keeps first interaction fast without fragmenting operational navigation.
- Route operational reads through the typed mandate API boundary with deterministic fixtures as the default; this allows a real commerce service to replace mocks without changing screens.
