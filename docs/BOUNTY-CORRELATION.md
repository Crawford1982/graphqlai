# Bug bounty triage fields (graphqlai reports)

graphqlai adds **heuristic** metadata to each finding so you can prioritize manual validation against **typical** public bug bounty norms. **It does not predict payouts, severity tiers, or duplicate acceptance.**

## Report fields

### Per finding (`findings[]`)

| Field | Meaning |
|--------|---------|
| **`payoutCorrelationScore`** | Integer **1–10**. Higher means “often worth validating first” on typical API programs — **not** dollar value or acceptance probability. |
| **`bountyAxes`** | Tags such as `broken_access_control`, `credential_material`, `availability`, `information_disclosure` — rough OWASP/APISec-style grouping for filtering. |
| **`typicalProgramOutcome`** | Short narrative: how similar signals are **often** treated (informational vs. serious) — **your** program’s rules override this. |
| **`validationEffort`** | `low` / `medium` / `high` — rough cost to prove **security** impact (not time to run graphqlai). |
| **`correlationNote`** | One-sentence guidance (what would convince a triager, common false-positive angles). |

### Summary (`bountyCorrelation`)

- **`disclaimer`** — Same caveats as above, embedded for tools that copy only the summary block.
- **`axisCounts`** — Count of findings per `bountyAxes` tag.
- **`suggestedManualOrder`** — Top findings by **`payoutCorrelationScore`** (quick queue for human review).
- **`meanScore`** — Average `payoutCorrelationScore` across all findings (useful for noisy runs vs. quiet runs).

## Sorting behavior

Within the same internal **kind** bucket and **confidence**, findings are ordered by **`payoutCorrelationScore` descending** so higher-relevance hypotheses float up in `findings[]`.

## Why this exists

Security impact and bounty value depend on **program scope**, **business context**, and **quality of proof**. These fields narrow the search space for **human** analysis and reporting — they are not automated severity labels for submission.
