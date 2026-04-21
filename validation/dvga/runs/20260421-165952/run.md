# DVGA validation run — 20260421-165952

## Goal

Stress-oriented campaign: increase **batch** and **depth** probe budgets while keeping transport conservative (low concurrency + small RPS cap + generous timeout).

## Target

- DVGA Docker container: `dvga-graphqlai`
- GraphQL HTTP endpoint: `http://127.0.0.1:5014/graphql`

## Command

```bash
node bin/graphqlai.mjs ^
  --target http://127.0.0.1:5014/graphql ^
  --schema validation/dvga/runs/20260421-165952/introspection.json ^
  --scope-file validation/dvga/runs/20260421-165952/scope.yaml ^
  --max-requests 260 ^
  --timeout-ms 25000 ^
  --concurrency 2 ^
  --max-rps 2 ^
  --batch-budget 16 ^
  --depth-budget 16 ^
  --max-depth 8 ^
  --variable-strategy balanced ^
  --output-dir validation/dvga/runs/20260421-165952
```

## Outcome

- Executed HTTP requests: **89**
- Findings: **23**

## Results[] family counts (high signal for DVGA “Denial of Service” themes)

- `GRAPHQL_BATCH_ALIAS`: **16** rows (batch / alias-oriented probes)
- `GRAPHQL_DEPTH_LADDER`: **16** rows (depth ladder probes)

## Finding title mix

- **15** × `Sensitive pattern in body preview`
- **7** × `Transport/timeout`
- **1** × `Looks like bearer/JWT material in body`
