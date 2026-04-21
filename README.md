# graphqlai

[![CI](https://github.com/Crawford1982/graphqlai/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Crawford1982/graphqlai/actions/workflows/ci.yml?query=branch%3Amaster)

**graphqlai** is a **GraphQL-only**, **schema-driven** HTTP tester: load **introspection JSON** **or SDL** (`*.graphql` / `*.graphqls` / `*.sdl`), compile **bounded POST** `application/json` operations, run them against a **single GraphQL endpoint URL**, and emit a **replayable JSON report** (`replayCurl` per row where possible). The intent is **surgical** coverage of GraphQL-shaped risk (replay, chains, batch/depth stress, envelope signals)—not breadth across arbitrary REST APIs.

It is **not** a general REST scanner. This repository stays **graphqlai only** (no Mythos/other product naming).

## Requirements

- **Node.js 18+** (uses built-in `fetch`)

## Install

```bash
cd graphqlai
npm install
npm test          # offline — no network (same as npm run verify)
```

Global CLI (optional):

```bash
npm link
graphqlai --help
```

## Usage

**`--target`** must be the full HTTP(S) URL of the GraphQL endpoint (typically `POST` only).  
**`--schema`** accepts introspection **JSON** (`data.__schema` or root `__schema`) **or** SDL (`.graphql` / `.graphqls` / `.sdl`).

```bash
npx graphqlai --target "https://api.example.com/graphql" --schema ./path/to/introspection.json --scope-file ./scope.yaml --max-requests 64
```

Product stance (GraphQL-only, surgical scope): **`docs/POSITIONING.md`**

**Authorized real targets:** **`docs/REAL-TARGET-TESTING.md`** — permission, `--scope-file`, schema, and rate limits.

**Bounty triage (report fields):** **`docs/BOUNTY-CORRELATION.md`** — `payoutCorrelationScore`, axes, and how sorting uses them (heuristic only).

**Trust & verification:** **`docs/CONFIDENCE.md`** — offline test matrix, CI, single HTTP execution path, report **`provenance`**, and honest limits. **`graphqlai --version`** (`-V`) prints semver and runtime fingerprint.

**Human-readable report:** after a run, **`npm run report:html -- output/graphqlai-report-*.json`** writes a **static `.html`** next to the JSON (open locally; no server).

**Publishing to npm:** **`docs/PUBLISH-NPM.md`**. **Advisor (LLM) roadmap:** **`docs/ADVISOR.md`** — not shipped yet; deterministic JSON remains authoritative.

Progress and handoff notes live in:

- `docs/STATUS.md`
- `docs/MILESTONES.md`

### Scope (recommended)

Use **`--scope-file`** with `allowHosts` and optional `pathPrefixes` so accidental host/path drift fails closed. Example:

```yaml
allowHosts:
  - api.example.com
pathPrefixes:
  - /graphql
```

### Auth

```bash
graphqlai -t https://api.example.com/graphql -s ./schema.json -a "YOUR_JWT"
# or
GRAPHQLAI_TOKEN=... graphqlai -t ... -s ... --auth-env GRAPHQLAI_TOKEN

# explicit headers (API keys, non-Bearer Authorization, cookies to session GraphQL):
graphqlai -t ... -s ... -H "X-Api-Key: ***" --cookie "sessionid=..."
graphqlai -t ... -s ... -H "Authorization: ApiKey ***"

# optional alternate principal replay (Milestone 2)
graphqlai -t ... -s ... --auth-env PRIMARY_TOKEN --auth-alt-env ALT_TOKEN --principal-replay-budget 12
```

Inbound throttling (optional): **`--respect-retry-after`** sleeps up to **`--max-retry-after-ms`** then retries each request at most **`--max-429-retries`** times when the server returns **429** with **`Retry-After`**.

### Milestone 2 options

- `--handle-replay-budget <n>`: cap extra queries that reuse **IDs from successful `data` responses** against queries with one id-like argument (default `24`; `0` disables)
- `--chain-budget <n>`: cap mutation->query follow-up requests (default `8`)
- `--auth-alt` / `--auth-alt-env`: alternate principal
- `--principal-replay-budget <n>`: how many query/mutation/handle-replay cases to replay as alt principal (default `12`)

**Variable payloads** (smarter defaults + bounded variants):

- `--max-payload-variants <n>`: compile up to **n** distinct variable maps per operation (default `2`, max `8`; total rows still capped by `--max-requests`)
- `--variable-strategy balanced|thorough`: larger enum slices and more input alternates when `thorough`

### Milestone 3 options

- `--batch-budget <n>`: cap batch/alias probe requests (default `8`)
- `--depth-budget <n>`: cap depth-ladder probe requests (default `8`)
- `--max-depth <n>`: max synthetic depth level used by depth-ladder probes (default `5`)

### CI

- **`--ci`** or **`GRAPHQLAI_CI=1`** — tightens concurrency, request caps, default RPS, and **`max-payload-variants`** (to `2`).
- **`--ci-fail-on-findings`** — exit code **2** if `findings.length > 0`.
- **`--ci-require-scope`** — refuses to run without **`--scope-file`**.

## Output

Reports are written under **`./output/`** (create with `--output-dir`):

- `graphqlai-report-<timestamp>.json` — findings, `results[]` with **`replayCurl`**, raw execution rows.

## Validation logging (DVGA lab runs)

When fuzzing intentionally vulnerable targets (recommended before real programs), keep artifacts under **`validation/`** so results are reviewable later:

- `validation/dvga/runs/<YYYYMMDD-HHmmss>/`
  - `scope.yaml` — recommended allowlist (`allowHosts`, `pathPrefixes`)
  - `introspection.json` — introspection snapshot used for that run (avoid UTF‑8 BOM on Windows when saving JSON)
  - `graphqlai-report-*.json` — full tool output (findings + replay curls)
  - `console.txt` — optional CLI transcript
  - `run.md` — optional human notes for that run
- `validation/dvga/notes/feedback-log.md` — qualitative notes (signal quality, false positives, misses)
- `validation/dvga/knowledge/run-index.json` — compact machine-readable summaries across runs
- `validation/dvga/knowledge/scenario-checklist.json` — DVGA themes → graphqlai artifacts (`results[].family`, example `caseId`s, manual verdict slots)

Playbook + scenario mapping (how to triage DVGA-style runs): `docs/DVGA-VALIDATION.md`

Pre-change regression checklist: `docs/REGRESSION.md`

Separate skill — bounty report craft vs tool validation: `docs/PARALLEL-BOUNTY-TRADECRAFT.md`

Stress threshold personas + live checklist: `docs/STRESS-THRESHOLD-VALIDATION.md`

Summarize any saved report locally:

```bash
node scripts/summarize-graphqlai-report.mjs validation/dvga/runs/<run>/graphqlai-report-*.json
```

Replay representative curls from a report against a running DVGA (after `docker run …`):

```bash
node scripts/replay-checklist-from-report.mjs validation/dvga/runs/<run>/graphqlai-report-*.json
```

Pull introspection JSON from an endpoint (authorized only):

```bash
npm run regression:introspect -- https://api.example.com/graphql ./my-introspection.json
```

Manual schema file options when introspection is blocked on the wire: **`docs/M5-MANUAL-SEED.md`**.

**Stress probes:** campaigns emit additional **`stress_anomaly`** findings when batch or depth probes show divergence vs baselines (see `src/verify/stressAnomalies.js`).

### Are DVGA findings “expected”?

**Often yes — and “many findings” does not automatically mean “many distinct bugs”.** DVGA is designed to exhibit noisy security-relevant behaviors (information disclosure previews, verbose errors, auth/JWT pitfalls, intentional DoS-ish responses, etc.). `graphqlai` reports **signals + evidence**, not final severity ratings; noisy targets will produce noisy rows until triage rules and budgets are tuned.

### Dummy / baseline GraphQL targets

- **Deterministic / offline behavior checks**: use the repo’s **`fixtures/*.json`** introspection snapshots with `npm test` (fully offline; best for regressions).
- **Live behavior checks (not vulnerability truth)**: any stable public GraphQL endpoint can be used to confirm transport + introspection ingest + reporting, but it will not validate “security accuracy” unless you already know ground truth.

## Repository layout

```
bin/graphqlai.mjs       # CLI entry
src/cli/                # argv, CI, auth-by-env
src/schema/             # introspection → operations; query compiler; variableDefaults; selectionBuilder; hypotheses; chain/handle replay; stress probes
src/pipeline/           # runCampaign (orchestration only)
src/net/                # HTTP executor (sole outbound I/O)
src/safety/             # scope policy + rate limit
src/verify/             # triage, signals, statistics, evidence curls, principal replay checker
src/model/              # observation log (no LLM)
src/signals/            # novelty index
data/bounty-signals.json # deterministic regex signals on response previews
fixtures/               # offline test introspection
scripts/                  # offline tests (npm test)
validation/             # lab validation artifacts (DVGA runs, notes, summaries)
```

## Principles

1. **GraphQL-first, bounded** — campaigns are capped (`--max-requests`, probe budgets); prefer **precision** over spraying unrelated HTTP surface.
2. **Executor owns HTTP** — planners / LLMs (future) never import the HTTP client here.
3. **Compiled requests** — GraphQL documents are built through **`queryCompiler.js`**, not ad hoc string concatenation scattered across the tree.
4. **Evidence-first** — every row gets a **`replayCurl`** when possible.
5. **Authorized testing only** — use **`--scope-file`** on real programs.

## Security

Security policy (authorized use, reporting bugs **in graphqlai**): **`SECURITY.md`**.

## License

MIT — see `LICENSE`.
