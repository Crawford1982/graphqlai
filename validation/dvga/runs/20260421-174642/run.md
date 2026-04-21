# Canonical DVGA regression — 20260421-174642

Smoke run after **`stress_anomaly`** findings + **`prioritizeFindingsForReport`** + SDL path support.

## Command

Same canonical profile as `docs/DVGA-VALIDATION.md`:

- `--max-requests 220 --timeout-ms 20000 --concurrency 2 --max-rps 2`

## Snapshot

- **Executed:** 73 HTTP rows  
- **Findings:** 24 rows  
- **`stress_anomaly`:** 4  
- **Report order:** first rows are **`bounty_signal`** then **`stress_anomaly`** (generic heuristics follow).

Report: `graphqlai-report-1776793722020.json` (see folder).
