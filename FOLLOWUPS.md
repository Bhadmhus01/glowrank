# Engineering follow-ups

Deferred risks and open decisions surfaced during the build. Resolve each before the
relevant code path goes live. The product/safety docs in `/docs` remain source of truth;
this file is engineering tracking only.

## M1 — Verify Anthropic model aliases before any real (non-mocked) call
`src/chain/models.ts` uses `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-7`.
CLAUDE.md §5 says use the latest alias and avoid dated pins, but the only confirmed
Haiku identifier is dated (`claude-haiku-4-5-20251001`). If a bare alias does not
resolve, the request fails at runtime — and mocked tests will not catch it.
- **Resolve:** confirm each alias against Anthropic's current model list; decide alias
  vs. dated pin with the founder (this is the §5 tension).
- **Status:** open. **Blocks:** first real chain call.

## M2 — Opus-on-Call-4 vs the $1.20/report budget
CLAUDE.md §5 assigns Opus to Call 4; `Prompt_Chain.md`'s cost table assumes Sonnet.
Opus likely pushes women's-with-makeup reports past the §5 ceiling.
- **Resolve:** measure real Call 4 cost once implemented; raise with founder before
  launch. Do NOT silently downgrade the model (§8).
- **Status:** open. **Blocks:** launch cost sign-off (not code).

## M3 — Orchestrator must honor Call 1's fail-closed contract
`runSafetyPrecheck` throws on unparseable/invalid output and must never be treated as
`PASS`. The orchestrator (still a stub) must route a thrown Call 1 to non-delivery /
manual review. Do NOT wrap it in a `try/catch` that defaults to PASS (CLAUDE.md §2 rule 3).
- **Resolve:** enforce and test when the orchestrator is built.
- **Status:** open. **Blocks:** orchestrator integration.
