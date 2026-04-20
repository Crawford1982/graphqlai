# graphqlai milestones

Ship order stays **vertical slices with tests**. Each milestone must remain bounded, replayable, and CI-safe.

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

### M2 next hardening items

- Better nested field-level diffs (not only top-level keys)
- Better chain candidate precision for non-ID patterns
- Replay prioritization based on novelty/sensitivity, not simple query order

## Milestone 3 (in progress, usable now)

- Bounded batch/alias probes (`--batch-budget`)
- Bounded depth-ladder probes (`--depth-budget`, `--max-depth`)

### M3 next hardening items

- Replace synthetic depth aliases with schema-aware nested selections
- Add dedicated anomaly scoring for batch/depth results (latency, error shape, partial-data anomalies)
- Add targeted M3 checkers (batch amplification and depth-complexity behavior)
- Expand batch probe generation (higher multiplicity, multi-ID enumeration, mixed operation patterns)

## Milestone 4 (planned) - optional bounded AI

- Advisor only (ranking and classification), never direct network execution
- Typed plan JSON validated by compiler before execution
- Prompt inputs stay metadata/summaries only (no sensitive raw payloads)

## Milestone 5 (planned) - ingest without introspection

- SDL ingest
- Manual seed operation files for introspection-disabled targets

## Additional quality track (from external review feedback)

- GraphQL-envelope-aware novelty scoring (`data/errors/field-shape`) as a cross-cutting improvement
- Deeper field-level principal diffing (beyond top-level key comparison)
- Replay prioritization informed by novelty/sensitivity signals

## Non-goals (until core is solid)

- Subscriptions/WebSocket fuzzing
- Federation-wide orchestration
- GUI-first workflows (CLI + JSON report remain source of truth)
