# Contributor / agent rules — graphqlai

Use this when extending the tool with AI-assisted editors.

## Boundaries

1. **`src/net/httpAgent.js`** is the only module that performs outbound HTTP (`fetch`). Do not add alternative HTTP stacks from planners or schema code.
2. **LLM integration (future)** belongs under something like **`src/advisor/`** or **`src/planner/`**, consumes **schema metadata + summaries only**, and outputs **JSON validated** against a strict schema before **`runCampaign`** runs—not raw executable queries.
3. **Scope** — respect **`scopePolicy`**; never bypass **`assertUrlInScope`** or redirect checks for “convenience.”

## Layering

| Area        | Responsibility |
|------------|----------------|
| `src/schema/` | Introspection → internal model; compile operation → `{ query, variables }`; hypothesis `FuzzCase[]` |
| `src/pipeline/` | Wire transport, verification, report; **no** query string building |
| `src/net/`   | Execute `FuzzCase` rows |
| `src/verify/` | Triage, regex signals (`data/bounty-signals.json`), statistics, curls |

## Tests

`npm test` must stay **offline** (no live HTTP). Add fixtures under **`fixtures/`** and scripts under **`scripts/`**.
