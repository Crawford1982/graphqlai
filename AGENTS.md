# Contributor / agent rules — graphqlai

Use this when extending the tool with AI-assisted editors.

**Product scope:** graphqlai remains **GraphQL HTTP–only** (single endpoint, compiled POST JSON campaigns). Do not steer development toward REST crawlers or generic full-site scanners — see **`docs/POSITIONING.md`**.

**Dependencies:** `graphql` is used only for **SDL → schema** (`buildSchema` / `introspectionFromSchema`) in `src/schema/introspectionLoader.js`. Do not add alternate GraphQL stacks for execution.

## Boundaries

1. **`src/net/httpAgent.js`** is the only module that performs outbound HTTP (`fetch`). Do not add alternative HTTP stacks from planners or schema code.
2. **LLM integration (future)** belongs under something like **`src/advisor/`** or **`src/planner/`**, consumes **schema metadata + summaries only**, and outputs **JSON validated** against a strict schema before **`runCampaign`** runs—not raw executable queries.
3. **Scope** — respect **`scopePolicy`**; never bypass **`assertUrlInScope`** or redirect checks for “convenience.”
4. **Security / authorization** — report vulnerabilities **in graphqlai** per **`SECURITY.md`**; real-target usage rules live in **`docs/REAL-TARGET-TESTING.md`**.

## Layering

| Area        | Responsibility |
|------------|----------------|
| `src/schema/` | Introspection → internal model; compile operation → `{ query, variables }`; hypothesis `FuzzCase[]` |
| `src/pipeline/` | Wire transport, verification, report; **no** query string building |
| `src/net/`   | Execute `FuzzCase` rows |
| `src/verify/` | Triage, regex signals (`data/bounty-signals.json`), statistics, curls |

## Tests

`npm test` must stay **offline** (no live HTTP). Add fixtures under **`fixtures/`** and scripts under **`scripts/`**. **`npm run verify`** runs the full offline suite (same as **`npm test`**).

## Reports

Campaign JSON includes **`provenance`** (**`src/verify/runProvenance.js`**) when extending **`runCampaign`** — keep metadata accurate (versions, deps, optional git SHA) so disclosure packets stay auditable.

CLI transport flags (**`-H`**, **`--cookie`**, optional **`--respect-retry-after`**) flow through **`buildTransportOpts`** into **`executeCases`** — preserve ordering in **`mergeTransportHeaders`** (`src/net/httpAgent.js`) when adding headers.

Future **LLM advisor**: **`docs/ADVISOR.md`** — no raw query execution from model output; validate JSON plans before **`runCampaign`**.

## Submission bundles

Deterministic **`submission-pack-*/`** output lives in **`src/submissions/`** + **`schemas/submission-bundle.schema.json`**. Extend **`buildSubmissionBundlesFromReport`** when new finding kinds need paired evidence — keep **`submissionReady`** conservative (**`docs/SUBMISSION-BUNDLE.md`**).
