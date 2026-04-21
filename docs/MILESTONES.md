# graphqlai milestones

Ship order stays **vertical slices with tests**. Each milestone must remain bounded, replayable, and CI-safe. Scope stays **GraphQL HTTP** (`application/json` to a single endpoint URL); milestones aim for **precision** on GraphQL bug classes, not REST coverage — see **`docs/POSITIONING.md`**.

## Status summary

- **M1 complete**
- **M2 complete (first strong pass)**
- **M3 started (first usable pass)**
- **M4+ planned**

## Milestone 1 (complete)

- Introspection JSON -> normalized operations
- Typed query compilation (scalar/composite-safe)
- POST JSON execution + scope + rate limits
- JSON report + `replayCurl`
- Deterministic signal matching (`data/bounty-signals.json`)
- Offline test suite

## Milestone 2 (complete, iterative hardening ongoing)

- Mutation->query dependency inference (`src/schema/campaignPlanner.js`)
- Bounded chain follow-ups (`--chain-budget`)
- Alternate principal replay (`--auth-alt`, `--auth-alt-env`, `--principal-replay-budget`)
- Principal findings:
  - same-body overlap
  - 403->200 status escalation
  - top-level field-shape difference

Recent builds (toward tier-1 payloads):

- Schema-aware selection sets (`src/schema/selectionBuilder.js`): queries/mutations request scored scalars + bounded nested objects instead of only `__typename`.
- Handle replay (`src/schema/handleReplay.js`, `--handle-replay-budget`): replay extracted IDs against queries with a single id-like argument.
- Principal replay: nested `data` shape fingerprint (`graphqlDataShapeFingerprint` in `principalReplay.js`).
- Smarter variable defaults (`src/schema/variableDefaults.js`): argument-name–aware strings/IDs (e.g. email, uuid), enum alternates, bounded **payload variants** per operation (`--max-payload-variants`, `--variable-strategy balanced|thorough`).

### M2 next hardening items

- Better nested field-level diffs (not only top-level keys)
- Better chain candidate precision for non-ID patterns
- Replay prioritization based on novelty/sensitivity, not simple query order

## Milestone 3 (in progress, usable now)

- Bounded batch/alias probes (`--batch-budget`)
- Bounded depth-ladder probes (`--depth-budget`, `--max-depth`)

### M3 next hardening items

- Replace synthetic depth aliases with schema-aware nested selections
- **Done (initial):** dedicated **`stress_anomaly`** findings from batch/depth execution rows (`src/verify/stressAnomalies.js`) — multi-error batch arrays, batch vs single divergence, depth-ladder latency ramps
- Add targeted M3 checkers (batch amplification and depth-complexity behavior)
- Expand batch probe generation (higher multiplicity, multi-ID enumeration, mixed operation patterns)

## Milestone 4 (planned) - optional bounded AI

- Advisor only (ranking and classification), never direct network execution
- Typed plan JSON validated by compiler before execution
- Prompt inputs stay metadata/summaries only (no sensitive raw payloads)

## Milestone 5 (planned) — introspection-disabled / offline schema workflows

- **SDL on disk:** **`--schema path/to/schema.graphql`** (`buildSchema` → introspection-shaped model in `src/schema/introspectionLoader.js`)
- Save introspection JSON via `scripts/pull-introspection.mjs` or external exports — **`docs/M5-MANUAL-SEED.md`**
- Advanced: stitched federation / incremental SDL merges — **not goals** unless scoped explicitly

## Additional quality track (from external review feedback)

- GraphQL-envelope-aware novelty scoring (`data/errors/field-shape`) as a cross-cutting improvement
- Deeper field-level principal diffing (beyond top-level key comparison)
- Replay prioritization informed by novelty/sensitivity signals

## Non-goals (until core is solid)

- General-purpose REST/HTML crawling or OpenAPI scanners (explicitly out of scope for this repo)
- Subscriptions/WebSocket fuzzing
- Federation-wide orchestration
- GUI-first workflows (CLI + JSON report remain source of truth)
