# Product positioning — graphqlai

## What graphqlai is

**graphqlai** stays **GraphQL-only**: one HTTP endpoint, **`application/json`** operations compiled from schema (typically from introspection input), bounded campaigns, **replay-first** artifacts.

Design goal: be **surgical**, not sprawling — targets the classes of flaws that show up **in GraphQL transports and schema-driven behavior**:

- Authorization and ID/data replay across principals (bounded replay, chains, handle replay)
- GraphQL-shaped stress (batch/array bodies, alias-heavy probes, depth ladders within strict budgets)
- Disclosure signals in GraphQL JSON envelopes (regex on **body previews**, statistics, heuristic triage)

## What graphqlai is not

- **Not** a general REST/OpenAPI scanner
- **Not** “find every bug class on the internet” — it finds **interesting GraphQL-shaped evidence** worth human triage on **in-scope** endpoints

## Precision upgrades (batch / depth)

Campaigns attach **`stress_anomaly`** findings when Milestone 3 probes show **structured** divergence (multi-error batch arrays, latency/status vs single-operation sibling, sharp depth-ladder slowdowns). Generic timeouts and regex hits still exist; stress rows are meant to separate **GraphQL-shaped stress signals** from pure noise where possible.

**Report ordering:** `prioritizeFindingsForReport` (`src/verify/findingRank.js`) surfaces **`bounty_signal`** and **`stress_anomaly`** before generic heuristic rows so busy routes remain triage-friendly.

## Stress validation

- Offline personas: `validation/stress-validation/` + `docs/STRESS-THRESHOLD-VALIDATION.md`

## Surgical vs noisy targets

Labs like DVGA are intentionally noisy; **finding count is not success metric**. Progress is **stable regression** (family histogram + evidence quality) plus **replayable curls** per hypothesis.
