# graphqlai — milestones

Ship order is **vertical slices** with tests—no “big bang” GraphQL platform.

## Milestone 1 — **Shipped (current)**

- Introspection JSON → normalized operations
- Typed query compilation (scalar vs composite selection rules)
- POST JSON envelope execution + scope + rate limit
- JSON report + `replayCurl`
- Regex signal pack (`data/bounty-signals.json`) + verbose-error heuristic
- CLI **`graphqlai`**, offline **`npm test`**

## Milestone 2 — Schema graph & stateful chains (implemented in this branch)

- Infer **mutation → query** edges from schema operation signatures
- **`campaignPlanner`**: build bounded follow-up chain requests from mutation response IDs
- **Cross-principal same-body checker** via query replay (`--auth-alt`, `--principal-replay-budget`)

## Milestone 3 — GraphQL-specific abuse modes

- **Batch / alias** payloads (bounded count)
- **Depth / complexity** ladders with timing + error-shape novelty
- Expand **`ResponseIndex` / novelty** beyond binary fingerprints for GraphQL `errors[]`

## Milestone 4 — Optional bounded AI

- **Advisor only**: rank operations / fields for budget; suggest selection expansions; classify findings from **summaries**—never raw secrets in prompts
- **`executionPlanCompiler`**: validate typed plan JSON → `FuzzCase[]` (symmetric with M1 compiler discipline)

## Milestone 5 — Ingest without introspection

- SDL file support + **manual seed** documents when introspection is disabled

## Non-goals (until core is solid)

- Subscriptions / WS gateway fuzzing
- Full GraphQL federation matrix
- GUI-first workflows (CLI + JSON report remain source of truth)
