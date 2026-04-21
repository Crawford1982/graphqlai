# DVGA Feedback Log

## Template

### Run
- Timestamp (UTC):
- Target URL:
- Introspection source:
- Command:

### What graphqlai found
- Finding count:
- Top signals:

### Manual validation
- Confirmed vulnerabilities:
- False positives:
- Misses (known DVGA issue not found):

### Actionability
- Evidence quality (curl/repro clarity):
- Report quality (ready for triage?):
- Suggested improvements:

---

### Run — 20260421-154533 (UTC folder id)
- Timestamp (UTC): **2026-04-21** (run folder `20260421-154533`)
- Target URL: `http://127.0.0.1:5014/graphql` (DVGA container `dvga-graphqlai`, host port **5014** → container **5013**)
- Introspection source: live POST introspection saved to `validation/dvga/runs/20260421-154533/introspection.json`
- Command:
  - `node bin/graphqlai.mjs --target http://127.0.0.1:5014/graphql --schema validation/dvga/runs/20260421-154533/introspection.json --scope-file validation/dvga/runs/20260421-154533/scope.yaml --max-requests 200 --output-dir validation/dvga/runs/20260421-154533`

### What graphqlai found
- Finding count: **32** (`Executed HTTP requests: 73`)
- Top signals:
  - **21** × `Transport/timeout`
  - **10** × `Sensitive pattern in body preview`
  - **1** × `jwt_or_bearer_leak`

### Manual validation
- Confirmed vulnerabilities: **not triaged yet** (next pass: spot-check highest-signal rows + replay curls)
- False positives: **unknown** (timeouts may be DVGA/gevent saturation vs real issue — needs replay + tuning `--timeout-ms` / `--max-requests`)
- Misses (known DVGA issue not found): **unknown** (need a checklist run against DVGA scenario list)

### Actionability
- Evidence quality (curl/repro clarity): **good artifacts present** (`graphqlai-report-*.json` includes replay rows); review `replayCurl` for the non-timeout findings first
- Report quality (ready for triage?): **usable for internal validation**; still noisy due to timeout-heavy signal mix
- Suggested improvements:
  - Reduce timeout-noise locally (increase `--timeout-ms`, lower concurrency, or split campaigns by probe type)
  - Windows artifact tip: write introspection JSON as UTF-8 **without BOM** (BOM breaks `JSON.parse` in Node)

---

### Run — 20260421-161136 (UTC folder id)
- Timestamp (UTC): **2026-04-21** (run folder `20260421-161136`)
- Target URL: `http://127.0.0.1:5014/graphql`
- Introspection source: copied from `validation/dvga/runs/20260421-154533/introspection.json`
- Command:
  - `node bin/graphqlai.mjs --target http://127.0.0.1:5014/graphql --schema validation/dvga/runs/20260421-161136/introspection.json --scope-file validation/dvga/runs/20260421-161136/scope.yaml --max-requests 220 --timeout-ms 20000 --concurrency 2 --max-rps 2 --output-dir validation/dvga/runs/20260421-161136`

### What graphqlai found
- Finding count: **19** (`Executed HTTP requests: 67`)
- Top signals:
  - **14** × `Sensitive pattern in body preview`
  - **4** × `Transport/timeout`
  - **1** × `jwt_or_bearer_leak`

### Manual validation
- Confirmed vulnerabilities: **not triaged yet**
- False positives: **unknown** (many “sensitive pattern” hits may be intentional DVGA behaviors / noisy previews)
- Misses (known DVGA issue not found): **unknown** (need scenario checklist triage)

### Actionability
- Evidence quality (curl/repro clarity): **same artifact model as prior run**
- Report quality (ready for triage?): **better signal mix than first pass** (timeouts dropped a lot after tuning)
- Suggested improvements:
  - Keep a rolling “DVGA scenario checklist” and map each scenario to **report row IDs** + **replay curl** + **manual verdict**
  - Track runs in `validation/dvga/knowledge/run-index.json` (machine-readable consolidation)

---

### Run — 20260421-162023 (UTC folder id)
- Timestamp (UTC): **2026-04-21** (run folder `20260421-162023`)
- Target URL: `http://127.0.0.1:5014/graphql`
- Introspection source: copied from `validation/dvga/runs/20260421-154533/introspection.json`
- Command:
  - `node bin/graphqlai.mjs --target http://127.0.0.1:5014/graphql --schema validation/dvga/runs/20260421-162023/introspection.json --scope-file validation/dvga/runs/20260421-162023/scope.yaml --max-requests 220 --timeout-ms 20000 --concurrency 2 --max-rps 2 --variable-strategy thorough --output-dir validation/dvga/runs/20260421-162023`

### What graphqlai found
- Finding count: **21** (`Executed HTTP requests: 67`)
- Top signals:
  - **14** × `Sensitive pattern in body preview`
  - **6** × `Transport/timeout`
  - **1** × `jwt_or_bearer_leak`

### Manual validation
- Confirmed vulnerabilities: **not triaged yet**
- False positives: **unknown**
- Misses (known DVGA issue not found): **unknown**

### Actionability
- Evidence quality (curl/repro clarity): **same artifact model**
- Report quality (ready for triage?): **compare vs run `20260421-161136`** (balanced strategy, same transport tuning)
- Suggested improvements:
  - Diff the two reports focusing on **non-timeout** findings + operation IDs / replay curls

---

## Cross-run diff (balanced vs thorough) — `20260421-161136` vs `20260421-162023`

- `executed` was **identical (67)**: the same *count* of HTTP rows can still differ in which operations get “findings” when variable strategies differ.
- `findings[]` `caseId` set differed by **2** (thorough added only):
  - `gql:query:paste:pv0`
  - `gql:query:paste:pv1`
- **Net effect:** thorough did not discover a totally different attack surface in this dataset; it mostly re-weighted **timeouts** and nudged a couple of `paste` variants into findings.

Interpretation (lab, not morality): **`--variable-strategy thorough` is not automatically “better” on DVGA** — it can increase slow-path behavior without changing meaningful coverage.

---

## Scenario checklist triage (DVGA README themes → graphqlai artifacts)

Evidence source of truth for mapping is always `graphqlai-report-*.json`: check `surfaceSummary`, `results[].family`, and `findings[]`.

| DVGA scenario bucket | Mapped graphqlai artifact (what we observed in these runs) | Notes |
|---|---|---|
| Discovering GraphQL / fingerprinting | `surfaceSummary.graphqlProbes`, `surfaceSummary.introspectionResponseLikely`, `results[]` baseline queries | Confirms endpoint behavior + introspection ingest path used by the campaign |
| Denial of Service — batch / aliases | `results[].family === GRAPHQL_BATCH_ALIAS` | We saw batch/array responses with GraphQL errors (including Python-ish server errors in previews on DVGA) — useful as **instability / parser mismatch signals**, not automatically “severity” |
| Denial of Service — deep recursion | `results[].family === GRAPHQL_DEPTH_LADDER` | Present across runs; compare counts when raising `--batch-budget/--depth-budget` |
| Information disclosure — introspection | `observationLog.kinds` includes `introspection_loaded` + `surfaceSummary.introspectionResponseLikely: true` | This confirms **schema-driven fuzzing is viable** on this DVGA mode; it is not the same as “introspection enabled in production” reporting |
| Authorization / JWT themes | `findings[]` titled **Looks like bearer/JWT material in body** (`signalId: jwt_or_bearer_leak`) | Treat as **candidate secret material**; DVGA often includes fake-ish tokens — verify manually before external sharing |
| Information disclosure — stack traces | Not prominent as dedicated `server_stack_trace` findings in these runs | If missing, it may mean previews didn’t match regex thresholds or responses were truncated — not proof DVGA lacks those scenarios |

Known gaps vs “ideal scanner storytelling” (honest):

- **`graphql_introspection_hint` didn’t appear as a dedicated finding** in these reports even though introspection clearly worked (tool uses introspection as input; separate “policy/introspection exposure” reporting may need product-level framing).

---

### Run — 20260421-165952 (UTC folder id) — higher batch/depth budgets

- Timestamp (UTC): **2026-04-21** (run folder `20260421-165952`)
- Target URL: `http://127.0.0.1:5014/graphql` (DVGA restarted fresh for this run)
- Introspection source: copied from `validation/dvga/runs/20260421-154533/introspection.json`
- Command:
  - `node bin/graphqlai.mjs --target http://127.0.0.1:5014/graphql --schema validation/dvga/runs/20260421-165952/introspection.json --scope-file validation/dvga/runs/20260421-165952/scope.yaml --max-requests 260 --timeout-ms 25000 --concurrency 2 --max-rps 2 --batch-budget 16 --depth-budget 16 --max-depth 8 --variable-strategy balanced --output-dir validation/dvga/runs/20260421-165952`

### What graphqlai found

- Finding count: **23** (`Executed HTTP requests: 89`)
- Top titles:
  - **15** × `Sensitive pattern in body preview`
  - **7** × `Transport/timeout`
  - **1** × `Looks like bearer/JWT material in body`
- Probe volume (`results[]` families):
  - `GRAPHQL_BATCH_ALIAS`: **16**
  - `GRAPHQL_DEPTH_LADDER`: **16**
  - `GRAPHQL_HANDLE_REPLAY`: **15** (more handle replay rows executed vs the 67-request runs)

### Manual validation

- Confirmed vulnerabilities: **not claiming CVE-level confirmation from heuristics alone**
- False positives / noise: **expected** — DVGA encourages disclosure-y previews; timeouts rise when DOS probe budgets increase
- Misses: **not exhaustively enumerated** — next increment is mapping each DVGA Postman scenario to at least one **replay curl** row ID

### Actionability

- Compare against `20260421-161136`:
  - Stress run executed **more DOS-family probes** (expected) at the cost of **more timeouts** (also expected).
- Operational docs added for repeatability:
  - `docs/DVGA-VALIDATION.md`
  - `scripts/summarize-graphqlai-report.mjs`

---

### Run — 20260421-170949 (UTC folder id) — canonical baseline **regression**

- Purpose: rerun **exact default profile** from `docs/DVGA-VALIDATION.md` after fresh DVGA container start.
- Target: `http://127.0.0.1:5014/graphql`
- Artifacts: `validation/dvga/runs/20260421-170949/graphqlai-report-1776791489128.json`
- Outcome: **73** executed, **20** findings (vs reference `20260421-161136`: **67** / **19** — **in ballpark**; +6 HTTP rows driven mainly by extra **handle replay** executions).
- Checklist: `validation/dvga/knowledge/scenario-checklist.json` (scenario → families / example `caseId`s → `manualVerdict` slots).

---

### Replay-backed checklist (`manualVerdict` filled)

- Date: **2026-04-21**
- Method: parsed `replayCurl` from `graphqlai-report-1776791489128.json`, POSTed via `scripts/replay-checklist-from-report.mjs` against local DVGA (`dvga-checklist`, port **5014**).
- Outcome: all theme rows marked **`expected`** in `validation/dvga/knowledge/scenario-checklist.json` with **replayEvidence** summaries (JWT material described, not copied into JSON).

