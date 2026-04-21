# graphqlai status and handoff

Updated: 2026-04-22

## Positioning

**graphqlai** remains **GraphQL-only** by design — one endpoint, compiled operations, bounded requests — oriented toward **surgical** probing of GraphQL transports (replay, chains, DOS-shaped probes, envelope disclosure) rather than competing with full-stack REST scanners. See **`docs/POSITIONING.md`**.

## Current state

`graphqlai` is a standalone GraphQL-focused CLI with:

- introspection ingest
- **Schema-aware selection sets** and **context-aware variable defaults** (plus optional **payload variants** per operation)
- compiled query/mutation request generation
- bounded campaign execution
- chain follow-up execution (M2)
- **handle replay** (reuse IDs from responses) (M2)
- alternate-principal replay (M2)
- initial batch/depth stress probes (M3)
- replayable JSON reporting
- **Stress probe anomalies** — `analyzeStressProbeAnomalies` adds `stress_anomaly` findings for batch/depth rows (`src/verify/stressAnomalies.js`)
- **Finding order** — `prioritizeFindingsForReport` promotes bounty + stress findings ahead of noisy heuristics (`src/verify/findingRank.js`)
- **SDL schemas** — `.graphql` / `.graphqls` / `.sdl` accepted on `--schema` (`graphql` dependency)
- **Stress personas** — offline JSON fixtures prove thresholds (`scripts/test-stress-personas.mjs`)

## Latest verification run

- `npm test` → **all tests pass**
  - schema loader + **SDL loader** (`test:sdl`)
  - query compiler (including selections)
  - variable defaults / variants (`test:variable`)
  - hypothesis engine (including variant ids)
  - campaign planner
  - handle replay
  - principal replay checker (nested data shape diff)
  - stress probes + **stress anomalies** + **stress personas** + **finding rank**

### Lab validation logging (DVGA)

DVGA-oriented runs and notes live under **`validation/dvga/`** (timestamped artifacts in `runs/`, qualitative feedback in `notes/`, summarized history in `knowledge/run-index.json`). See **`README.md` → “Validation logging (DVGA lab runs)”** for the conventions.

Important framing: DVGA should often produce **many heuristic findings** — that is compatible with both “tool is behaving” **and** “signals need triage/threshold tuning,” because DVGA is intentionally noisy.

Scenario checklist + interpretation notes: **`docs/DVGA-VALIDATION.md`**.

Pre-merge DVGA regression steps: **`docs/REGRESSION.md`**.

Parallel (non-tool) bounty writing study: **`docs/PARALLEL-BOUNTY-TRADECRAFT.md`**.

### Engineering audit notes (where “behavior” is defined)

- **Transport**: `src/net/httpAgent.js` — single outbound `fetch`, timeouts via `AbortController`, scope enforced before network I/O.
- **Signals**: `data/bounty-signals.json` — deterministic regex matchers on **body previews only**.
- **Triage / findings**: `src/verify/triage.js` (+ helpers in `src/verify/*`) — converts previews + stats into `findings[]`.

## What is solid

- architecture boundaries are good (`schema`, `pipeline`, `net`, `verify`, `cli`)
- deterministic/offline tests exist for each shipped slice
- scope and CI controls are present
- evidence output and replayability are preserved

## Known limitations

- M3 depth ladders still combine synthetic stacking with shallow selections for injection points; schema-real depth probing is partially covered by nested selections on base queries
- novelty/scoring is still simple for complex GraphQL envelope behavior
- **SDL on disk is supported** on `--schema`; advanced federation / partial-schema stitching remains out of scope unless explicitly designed (`docs/M5-MANUAL-SEED.md`)

## Urgent attention items

- **Keep scope restrictions on real targets** (`--scope-file`, CI scope requirement where possible).

## Next recommended work order

1. **M3 quality pass (continued)**
   - expand batch probe patterns where useful; tune thresholds using `validation/stress-validation/` + live authorized samples (`docs/STRESS-THRESHOLD-VALIDATION.md`)
2. **M2 / cross-cutting**
   - GraphQL-envelope-aware novelty
   - smarter replay prioritization (novelty/sensitivity)
3. **M4 bounded AI advisor**
   - ranking/classification only
   - typed plan validation gate required

## Session restart checklist

1. `npm test`
2. Smoke campaign with `--chain-budget`, `--handle-replay-budget`, `--principal-replay-budget`, `--max-payload-variants`, `--batch-budget`, `--depth-budget`
3. Continue from `docs/MILESTONES.md`

