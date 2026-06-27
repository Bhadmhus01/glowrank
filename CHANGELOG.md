# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches a release.

## [Unreleased]

### Added

- Repository standards: ESLint (flat config) + Prettier, `.editorconfig`, `.nvmrc`, Husky
  pre-commit with lint-staged, Vitest coverage, and an aggregate `npm run check` gate.
- Governance: `LICENSE` (proprietary), `CONTRIBUTING.md`, `SECURITY.md`, `CODEOWNERS`,
  Dependabot config, PR/issue templates, and this changelog.
- Generation idempotency / replay: terminal-outcome marker on orders so duplicate Stripe
  webhooks and manual replays no longer double-run the chain or re-deliver.
- Stripe Checkout-session endpoint (`api/checkout.ts`) linking intake → payment → generation.
- `M5_DESIGN.md` — engineering design for modified-report variants (ED / MEDICAL / AGING).
- Launch-readiness tooling: centralized env config + readiness check (`src/config/env.ts`), an
  operator `npm run preflight` CLI, and a public `GET /api/health` liveness probe.

### Changed

- Upgraded `@vercel/node` (3 → 5) and `vitest` (2 → 4), clearing the critical advisory; updated
  test mocks for vitest 4's constructable-mock change.
- Hardened CI: format check, lint, and a production-dependency `npm audit` gate.

### Fixed

- TypeScript errors under `exactOptionalPropertyTypes`.
- Parse-error rethrows in the AI chain now preserve the original error via `cause`.
