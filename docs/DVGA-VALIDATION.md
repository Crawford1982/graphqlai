# DVGA validation playbook

This repo keeps lab artifacts under `validation/dvga/` so **GraphQL-only**, **bounded** benchmarking is reproducible — aligned with graphqlai’s **surgical** focus (see **`docs/POSITIONING.md`**): DVGA validates schema-driven probes and envelope behavior, not “total vulnerability coverage.”

## Folder layout

- `runs/<YYYYMMDD-HHmmss>/`
  - `scope.yaml` — host/path allowlist (`src/safety/scopePolicy.js`)
  - `introspection.json` — snapshot used for that run (**UTF-8 without BOM** on Windows)
  - `graphqlai-report-*.json` — full campaign output (`results[]`, `findings[]`, `replayCurl`)
  - `console.txt` — optional CLI transcript
  - `run.md` — human notes for that run
- `notes/feedback-log.md` — qualitative triage / misses / noise notes
- `knowledge/run-index.json` — compact summaries across runs

## Summarize any report locally

```bash
node scripts/summarize-graphqlai-report.mjs validation/dvga/runs/<run>/graphqlai-report-*.json
```

## Scenario checklist (DVGA README → graphqlai artifacts)

DVGA scenarios are training goals; `graphqlai` emits **signals + evidence**, not final severity.

| DVGA theme | What to look for in `graphqlai-report-*.json` |
|---|---|
| Denial of Service — batch / aliases | `results[].family === "GRAPHQL_BATCH_ALIAS"` (batch/array bodies, alias-heavy probes) |
| Denial of Service — deep recursion | `results[].family === "GRAPHQL_DEPTH_LADDER"` |
| Information disclosure — introspection | Introspection snapshot exists + `surfaceSummary.introspectionResponseLikely`; optional `graphql_introspection_hint` signal hits |
| Authorization / JWT themes | Findings titled **Looks like bearer/JWT material in body** (`data/bounty-signals.json` → `jwt_or_bearer_leak`) |
| Injection / verbose errors | `sql_error_echo`, `server_stack_trace`, or heuristic body-preview matches (`src/verify/triage.js`) |

## Interpreting noisy runs

- **`Transport/timeout`** often reflects **target saturation / slow operations / aggressive probes**, not a distinct vulnerability class. Tune `--timeout-ms`, `--concurrency`, `--max-rps`, and scenario-specific budgets (`--batch-budget`, `--depth-budget`, `--max-requests`).

## Recommended default profile (canonical lab run)

Across DVGA benchmarking in this repo, treat **`validation/dvga/runs/20260421-161136`** as the **baseline “tool is healthy”** profile: tuned transport (timeouts + concurrency + RPS cap) with **`--variable-strategy balanced`**, **lower timeout noise** than the first pass, and **minimal extra finding churn** versus thorough (which mostly added two `paste` variants and more timeouts).

Use this command as the default regression against local DVGA (`http://127.0.0.1:<port>/graphql`; replace port if your container mapping differs):

```bash
node bin/graphqlai.mjs \
  --target http://127.0.0.1:5014/graphql \
  --schema validation/dvga/runs/20260421-161136/introspection.json \
  --scope-file validation/dvga/runs/20260421-161136/scope.yaml \
  --max-requests 220 \
  --timeout-ms 20000 \
  --concurrency 2 \
  --max-rps 2 \
  --output-dir validation/dvga/runs/<new-run-id>
```

**When to deviate:**

- **`--variable-strategy thorough`** — occasional deeper variable coverage; compare against baseline if you change compiler behavior.
- **Higher `--batch-budget` / `--depth-budget` / `--max-depth`** — intentional “DOS probe stress” (expect more timeouts); see run `20260421-165952`.
- **First-pass / legacy settings** — wide-open concurrency or short timeouts (e.g. early `20260421-154533`) are fine for history, not as the default bar for “green.”

## Regression freeze (“same ballpark” bar)

After tool changes, rerun the **recommended default profile** and compare to the pinned reference **`validation/dvga/runs/20260421-161136`** / latest regression **`validation/dvga/runs/20260421-170949`**.

Exact HTTP counts may drift slightly (especially **`GRAPHQL_HANDLE_REPLAY`** — depends on IDs returned during the campaign). Focus on:

- Same **`results[].family` histogram shape** (mutation/query/chain/batch/depth counts stable)
- Finding **title mix** not wildly different (DVGA noise stays noisy; large swings warrant investigation)

Structured checklist + diff notes: **`validation/dvga/knowledge/scenario-checklist.json`**.

## Scanner validation vs bounty tradecraft

`graphqlai` output on DVGA proves **engineering correctness + evidence pipeline + heuristic sensitivity**. Bug bounty success also needs **program scope, manual confirmation, impact narrative, and report quality** — study those separately; do not confuse “many DVGA findings” with “many H1 payouts.”

See also: `docs/POSITIONING.md` (GraphQL-only, surgical scope), `docs/REGRESSION.md` (pre-change steps), and `docs/PARALLEL-BOUNTY-TRADECRAFT.md` (report-writing track).
