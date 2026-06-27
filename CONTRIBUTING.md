# Contributing to GlowRank

Internal contributor guide. This is a proprietary codebase (see [`LICENSE`](LICENSE)).

> **Read [`CLAUDE.md`](CLAUDE.md) before writing any code.** It is the operating contract:
> safety rules, tone discipline, and the things that may never be auto-generated (prompts,
> user-facing copy). The rules there override convenience.

## Setup

```bash
nvm use            # Node 20 (.nvmrc)
npm install        # also installs the Husky pre-commit hook
cp .env.example .env
```

## The golden rule before pushing

```bash
npm run check      # format check + lint + typecheck + tests — all must pass
```

A Husky pre-commit hook runs `lint-staged` (Prettier + ESLint) on staged files, but `npm run
check` is the real gate and is enforced in CI.

## Workflow

1. **Branch off `main`.** Never commit directly to `main` or `staging`.
   - `feat/…` new behavior · `fix/…` bug fix · `chore/…` tooling/deps · `docs/…` docs.
2. **Small, logical commits.** If a change exceeds ~200 lines of new code, stop and split it
   (CLAUDE.md §6). Imperative commit subjects ("Add…", "Fix…").
3. **Tests are not optional** for anything touching the prompt chain, the safety filter, the
   photo-deletion job, the age gate, or payments. Mock all external SDKs — tests never hit a
   real API.
4. **Open a PR** into `main`, fill in the template, and get CI green + a review before merge.
   Pushing to `main` requires explicit human approval (CLAUDE.md §10).

## What requires a human sign-off (do not do it unprompted)

Per CLAUDE.md §2 and §7:

- Editing any prompt in `docs/Prompt_Chain.md` (clinically tone-audited).
- Writing or changing user-facing copy not already in `docs/Landing_Copy.md`.
- Weakening or bypassing the safety filter, age gate, or banned-terms backstop.
- Code touching photos, payments, or anything legal.
- Adding a dependency or changing a locked tech-stack choice (CLAUDE.md §4).

When in doubt, ask one clear question rather than guessing.

## Code style

Prettier + ESLint are authoritative — don't hand-format. TypeScript runs in `strict` mode with
`exactOptionalPropertyTypes`; prefer omitting optional fields over assigning `undefined`.
Never log PII (CLAUDE.md §9).
