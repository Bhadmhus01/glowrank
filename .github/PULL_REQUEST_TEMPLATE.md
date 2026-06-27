<!-- Read CLAUDE.md before opening a PR. Keep changes small and focused. -->

## What & why

<!-- What does this change and why? Link any issue: Closes #123 -->

## How it was verified

- [ ] `npm run check` passes locally (format + lint + typecheck + tests)
- [ ] New/updated tests cover the change (external SDKs mocked)

## Safety checklist (CLAUDE.md §2 / §7)

- [ ] No prompt in `docs/Prompt_Chain.md` was changed without sign-off
- [ ] No new user-facing copy was invented (it lives in `docs/Landing_Copy.md`)
- [ ] The safety filter / age gate / banned-terms backstop were not weakened
- [ ] No PII is logged
- [ ] If photos/payments/legal are touched, a human reviewer is aware

## Notes for the reviewer

<!-- Anything risky, any follow-ups, what could break. Be specific. -->
