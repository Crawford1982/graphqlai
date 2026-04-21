# Stress thresholds — offline personas + live checks

## Offline (CI)

Three synthetic personas under `validation/stress-validation/` prove **batch**, **resolver-noise batch**, and **depth-ramp** paths in `src/verify/stressAnomalies.js` without network access:

```bash
node scripts/test-stress-personas.mjs
```

## Live (authorized targets)

To validate against **2–3 real GraphQL APIs**, use the same canonical process as DVGA:

1. **Save schema** — introspection JSON (`npm run regression:introspect`) **or** SDL file (`*.graphql`) if you maintain schema out-of-band.
2. **`--scope-file`** — strict host + `/graphql` prefix.
3. **Bounded flags** — start with defaults in `docs/DVGA-VALIDATION.md`, then tune timeouts/RPS.

Record each run under `validation/<program>/runs/…` and note:

- Count of **`kind: stress_anomaly`** vs **`Sensitive pattern`** rows.
- Whether **`prioritizeFindingsForReport`** surfaces bounty + stress rows at the **top** of `findings[]`.

## Threshold tuning

Magic numbers live in **`src/verify/stressAnomalies.js`** (latency ratios, minimum milliseconds). Adjust there after reviewing false positives on a given API class.
