# graphqlai status and handoff

Updated: 2026-04-19

## Current state

`graphqlai` is now a standalone GraphQL-focused CLI with:

- introspection ingest
- compiled query/mutation request generation
- bounded campaign execution
- chain follow-up execution (M2)
- alternate-principal replay (M2)
- initial batch/depth stress probes (M3)
- replayable JSON reporting

## Latest verification run

Performed at end of session:

- `npm test` -> all tests pass
  - schema loader
  - query compiler
  - hypothesis engine
  - campaign planner
  - principal replay checker
  - stress probes
- live smoke run against public endpoint with M2/M3 flags -> successful report generation

## What is solid

- architecture boundaries are good (`schema`, `pipeline`, `net`, `verify`, `cli`)
- deterministic/offline tests exist for each shipped slice
- scope and CI controls are present
- evidence output and replayability are preserved

## Known limitations

- M2 field-level principal diff is currently top-level shape based
- chain inference is stronger than initial pass but still heuristic
- M3 depth probes are synthetic and not yet schema-deep traversal
- novelty/scoring is still simple for complex GraphQL envelope behavior

## External assessment notes (captured)

Two external reviews (Sonnet and ChatGPT) broadly agree on direction:

- strengths:
  - focused GraphQL-only scope is a better product lane than broad scanner sprawl
  - architecture boundaries are clean and enforceable
  - campaign loop is coherent (ingest -> compile -> execute -> replay -> report)
- high-impact gaps:
  - novelty scoring should become GraphQL-envelope aware (`data/errors/shape`) instead of mostly hash/status
  - depth probing should become schema-real nested traversal (not synthetic alias stacking)
  - batch probes should expand beyond simple duplication
  - principal checks should continue toward richer field-level and resolver-drift signals
  - SDL/manual seed path remains important for introspection-disabled targets

These notes are folded into `docs/MILESTONES.md` priorities below.

## Urgent attention items

Only one item is truly urgent before long sessions:

- **keep scope restrictions on real targets** (`--scope-file`, CI scope requirement where possible)

Everything else is important, but can safely continue next session in milestone order.

## Next recommended work order

1. **M3 quality pass**
   - schema-aware nested selection depth probes
   - batch/depth anomaly scoring
   - M3-specific checkers
2. **M2 refinement**
   - deeper cross-principal field/path diffs
   - smarter replay prioritization
3. **M4 bounded AI advisor**
   - ranking/classification only
   - typed plan validation gate required

## Session restart checklist

1. `cd graphqlai`
2. `npm test`
3. Run a smoke campaign with:
   - `--chain-budget`
   - `--principal-replay-budget`
   - `--batch-budget`
   - `--depth-budget`
4. Start work from `docs/MILESTONES.md` -> M3 hardening items

