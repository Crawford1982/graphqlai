# graphqlai

**graphqlai** is a focused **GraphQL HTTP security fuzzer**: load an **introspection snapshot**, compile **bounded POST** `application/json` operations, run them against a **single GraphQL endpoint URL**, and emit a **replayable JSON report** (curl snippets per row).

It is **not** a general REST scanner. It is **not** tied to any vendor “Mythos” product name—this repository is the **graphqlai** tool only.

## Requirements

- **Node.js 18+** (uses built-in `fetch`)

## Install

```bash
cd graphqlai
npm install
npm test          # offline — no network
```

Global CLI (optional):

```bash
npm link
graphqlai --help
```

## Usage

**`--target`** must be the full HTTP(S) URL of the GraphQL endpoint (typically `POST` only).  
**`--schema`** must point to a JSON file containing either a full GraphQL response with `data.__schema`, or a document with a root `__schema` object (saved introspection).

```bash
npx graphqlai --target "https://api.example.com/graphql" --schema ./path/to/introspection.json --scope-file ./scope.yaml --max-requests 64
```

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

# optional alternate principal replay (Milestone 2)
graphqlai -t ... -s ... --auth-env PRIMARY_TOKEN --auth-alt-env ALT_TOKEN --principal-replay-budget 12
```

### Milestone 2 options

- `--chain-budget <n>`: cap mutation->query follow-up requests (default `8`)
- `--auth-alt` / `--auth-alt-env`: alternate principal
- `--principal-replay-budget <n>`: how many query cases to replay as alt principal (default `12`)

### Milestone 3 options

- `--batch-budget <n>`: cap batch/alias probe requests (default `8`)
- `--depth-budget <n>`: cap depth-ladder probe requests (default `8`)
- `--max-depth <n>`: max synthetic depth level used by depth-ladder probes (default `5`)

### CI

- **`--ci`** or **`GRAPHQLAI_CI=1`** — tightens concurrency, request caps, and default RPS.
- **`--ci-fail-on-findings`** — exit code **2** if `findings.length > 0`.
- **`--ci-require-scope`** — refuses to run without **`--scope-file`**.

## Output

Reports are written under **`./output/`** (create with `--output-dir`):

- `graphqlai-report-<timestamp>.json` — findings, `results[]` with **`replayCurl`**, raw execution rows.

## Repository layout

```
bin/graphqlai.mjs       # CLI entry
src/cli/                # argv, CI, auth-by-env
src/schema/             # introspection → operations; query compiler; hypotheses; chain planner
src/pipeline/           # runCampaign (orchestration only)
src/net/                # HTTP executor (sole outbound I/O)
src/safety/             # scope policy + rate limit
src/verify/             # triage, signals, statistics, evidence curls, principal replay checker
src/model/              # observation log (no LLM)
src/signals/            # novelty index
data/bounty-signals.json # deterministic regex signals on response previews
fixtures/               # offline test introspection
scripts/                  # offline tests (npm test)
```

## Principles

1. **Executor owns HTTP** — planners / LLMs (future) never import the HTTP client here.
2. **Compiled requests** — GraphQL documents are built through **`queryCompiler.js`**, not ad hoc string concatenation scattered across the tree.
3. **Evidence-first** — every row gets a **`replayCurl`** when possible.
4. **Authorized testing only** — use **`--scope-file`** on real programs.

## License

MIT — see `LICENSE`.
