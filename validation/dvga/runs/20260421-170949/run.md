# DVGA validation run — 20260421-170949

## Purpose

**Canonical baseline regression:** same flags as documented in `docs/DVGA-VALIDATION.md` (recommended default profile), against a fresh DVGA container.

## Target

- `http://127.0.0.1:5014/graphql` (`dvga-graphqlai`, `5014→5013`)

## Command

Matches reference run `20260421-161136`:

```bash
node bin/graphqlai.mjs \
  --target http://127.0.0.1:5014/graphql \
  --schema validation/dvga/runs/20260421-170949/introspection.json \
  --scope-file validation/dvga/runs/20260421-170949/scope.yaml \
  --max-requests 220 \
  --timeout-ms 20000 \
  --concurrency 2 \
  --max-rps 2 \
  --output-dir validation/dvga/runs/20260421-170949
```

(`introspection.json` / `scope.yaml` copied from `20260421-161136`.)

## Outcome

- Executed HTTP requests: **73**
- Findings: **20**

## Regression vs `20260421-161136`

Reference had **67** executed / **19** findings. This run is **in the same ballpark**; the main structural delta is **more `GRAPHQL_HANDLE_REPLAY` rows executed** (handle replay is data-dependent on IDs returned from DVGA).

See `validation/dvga/knowledge/scenario-checklist.json` → `comparison`.
