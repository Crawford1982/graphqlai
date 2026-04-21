# Confidence, verification, and limits

This document explains **why you can rely on graphqlai’s engineering discipline**, what **automated verification** covers, and what **requires human judgment** — especially for bug bounty submissions.

## What builds trust

### Single outbound path

All HTTP traffic goes through **`src/net/httpAgent.js`** (`fetch` only). Planners and compilers do not open sockets themselves, which keeps behavior auditable and limits accidental scope creep.

### Offline test suite (`npm test`)

Every push runs the same scripts **locally and in CI** — no live network calls:

| Area | Scripts |
|------|---------|
| Schema loading + SDL → introspection | `test:schema`, `test:sdl` |
| Query compilation | `test:compile` |
| Variables / payloads | `test:variable` |
| Hypotheses | `test:hypothesis` |
| Campaign planning | `test:planner` |
| Handle replay | `test:handle` |
| Alternate principal replay | `test:principal` |
| Stress probes & anomalies | `test:stress`, `test:stress-anomalies`, `test:stress-personas` |
| Finding order + bounty tags | `test:finding-rank`, `test:bounty-correlation` |

**CI:** `.github/workflows/ci.yml` runs **`npm ci`** and **`npm test`** on **Ubuntu** with Node **18 / 20 / 22**.

### Replayable artifacts

Campaign output is structured JSON with **`replayCurl`** where possible — designed for independent verification by you or the program team.

### Report **`provenance`** block

Every campaign report includes **`provenance`** (`src/verify/runProvenance.js`):

- **graphqlai** semver from **`package.json`**
- **Node.js** version and OS **platform/arch** (debugging “works on my machine”)
- **`ci`**: whether common CI environment variables were set when the run was executed
- **`gitSha`**: Git commit when **`GITHUB_SHA`** / **`GRAPHQLAI_GIT_SHA`** / **`COMMIT_SHA`** is set (e.g. reproducible pipelines); usually **`null`** on ad hoc laptops
- **Declared dependency versions** (`graphql`, `js-yaml`) from **`package.json`** — not lockfile-resolution detail, but enough for coarse reproducibility talk

Optional: export **`GRAPHQLAI_GIT_SHA`** locally before a run when you want the report to cite an exact repo revision in a disclosure packet.

### Transparency on outputs

- **`confidence`** scores are heuristic and documented in **`src/verify/confidence.js`**.
- **`payoutCorrelationScore`** and **`bountyAxes`** are **triage aids only** — see **`docs/BOUNTY-CORRELATION.md`**.
- Regex signal packs live in **`data/bounty-signals.json`** — inspectable and extendable.

## Hard limits (be explicit with triagers)

- graphqlai generates **hypotheses and signals**, not pentest verdicts or guaranteed CVSS scores.
- **Impact and payout** depend on program rules, duplicates, and business context — not on tool output alone.
- **Stress** probes can be noisy on lab apps or misconfigured gateways; correlation fields help prioritize **manual** analysis.

## Suggested checklist before sharing a report externally

1. Confirm **authorization** for the target (**`docs/REAL-TARGET-TESTING.md`**).
2. Attach **`provenance`** (already in JSON) plus your **minimal repro** (`replayCurl`).
3. Redact tokens and secrets from snippets.
4. State whether findings are **confirmed** vs **needs validation** — the JSON format supports both narratives.
