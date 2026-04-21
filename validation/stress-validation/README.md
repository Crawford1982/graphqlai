# Stress threshold personas (offline)

Synthetic `results[]` shapes in this folder mimic **diverse GraphQL HTTP behaviors** without live calls:

| File | Intent |
|------|--------|
| `persona-apollo-batch.json` | JSON **array** of results, **multiple** `errors` blocks |
| `persona-ruby-batch.json` | Resolver stack style text + **4xx vs 2xx** + latency ratio vs single op |
| `persona-depth-ramp.json` | **Depth ladder** latency ratio on one field |

`scripts/test-stress-personas.mjs` asserts `analyzeStressProbeAnomalies` fires for each persona.

For **live** API checks, run an authorized campaign and compare to pinned DVGA regression reports (`docs/DVGA-VALIDATION.md`).
