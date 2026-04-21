# Testing on real GraphQL targets

**Yes — the tool is ready for authorized, in-scope testing** on production-like endpoints, provided you treat it as **high-signal recon + bounded fuzzing**, not “fire and forget.”

## Preconditions (non-negotiable)

1. **Written permission** — program policy, contract, or internal approval that explicitly allows **dynamic security testing** of the GraphQL HTTP API you target.
2. **`--scope-file`** — restrict `allowHosts` + `pathPrefixes` (typically `/graphql`) so redirects and mistakes fail closed (`src/safety/scopePolicy.js`).
3. **Schema** — introspection JSON **or** SDL (`*.graphql` / `*.graphqls` / `*.sdl`). If introspection is disabled live, use a vendor-exported SDL file or `npm run regression:introspect` when permitted (`docs/M5-MANUAL-SEED.md`).
4. **Rate & volume** — start with **`--ci`** or low `--max-requests`, **`--concurrency 2`**, **`--max-rps 2`**, conservative **`--timeout-ms`**; raise budgets only after baseline stability (same idea as `docs/DVGA-VALIDATION.md`).

## Suggested first command shape

```bash
graphqlai --target "https://api.example.com/graphql" \
  --schema ./schema.json \
  --scope-file ./scope.yaml \
  --max-requests 120 \
  --timeout-ms 15000 \
  --concurrency 2 \
  --max-rps 2 \
  --output-dir ./output
```

Add **`--auth`** / **`--auth-env`** when the API requires it.

## What to expect

- **`findings[]`** are **heuristic + evidence** (regex, stress rows, statistics). Review **`replayCurl`** before any external disclosure.
- **`stress_anomaly`** and **`bounty_signal`** rows are **surfaced first** in the report (`src/verify/findingRank.js`).

## After the run

- Archive reports under your own **`validation/<program>/runs/`** if you want parity with DVGA lab hygiene.
- **`npm test`** stays offline; real-target runs are **never** required for CI.
