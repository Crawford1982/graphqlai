# Submission bundles (operator workflow)

graphqlai writes a **`submission-pack-<timestamp>/`** directory next to **`graphqlai-report-<timestamp>.json`** after each campaign **unless** you pass **`--no-export-submissions`**.

This is **deterministic** packaging only — **no LLM**. It exists so a non-specialist operator can:

1. Open **`INDEX.md`** — sorted roughly by bounty triage score (`payoutCorrelationScore`).
2. Drill into **`finding-NNN-<slug>/SUBMISSION.md`** — checklist, evidence slots, escalation hints, placeholders for impact text.
3. Copy **`bundle.json`** if your pipeline consumes JSON.

## Contents

| Path | Purpose |
|------|---------|
| **`manifest.json`** | Pack metadata + pointer to JSON Schema |
| **`INDEX.md`** | Summary table linking to each bundle |
| **`finding-…/bundle.json`** | Structured bundle (`schemaVersion: "1.0.0"`) |
| **`finding-…/SUBMISSION.md`** | Human-facing narrative scaffold |
| **`finding-…/repro-*.sh`** | Shell stubs wrapping redacted **`replayCurl`** when available |

Schema: **`schemas/submission-bundle.schema.json`**.

## `submissionReady`

**Conservative.** Currently **`true`** mainly when:

- **`cross_principal_status_escalation`** (403 vs 200 across principals),
- Both sides have **`replayCurl`** in the report,

and even then **you must verify** scope, duplicates, and impact. Everything else ships as **`submissionReady: false`** with explicit **`submissionReadyReason`**.

## Offline export from an old report

```bash
node scripts/export-submission-pack.mjs path/to/graphqlai-report-xxxx.json
```

Writes `…-submission-pack/` beside the JSON by default.

## Ethics

Bundles **redact** obvious secrets heuristically — **you** are responsible before any external disclosure. Authorized testing only (**`docs/REAL-TARGET-TESTING.md`**).
