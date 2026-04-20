# graphqlai status and handoff

Updated: 2026-04-20

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

## Latest verification run

- `npm test` → **all tests pass**
  - schema loader
  - query compiler (including selections)
  - variable defaults / variants (`test:variable`)
  - hypothesis engine (including variant ids)
  - campaign planner
  - handle replay
  - principal replay checker (nested data shape diff)
  - stress probes

## What is solid

- architecture boundaries are good (`schema`, `pipeline`, `net`, `verify`, `cli`)
- deterministic/offline tests exist for each shipped slice
- scope and CI controls are present
- evidence output and replayability are preserved

## Known limitations

- M3 depth ladders still combine synthetic stacking with shallow selections for injection points; schema-real depth probing is partially covered by nested selections on base queries
- novelty/scoring is still simple for complex GraphQL envelope behavior
- SDL/manual seed path (introspection-disabled targets) remains planned (M5)

## Urgent attention items

- **Keep scope restrictions on real targets** (`--scope-file`, CI scope requirement where possible).

## Next recommended work order

1. **M3 quality pass**
   - batch/depth anomaly scoring
   - expand batch probe patterns where useful
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

