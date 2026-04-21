# DVGA validation run — 20260421-162023

## Goal

Benchmark `graphqlai` against DVGA using **`--variable-strategy thorough`** while keeping transport settings conservative (timeouts + low concurrency + small RPS cap).

## Target

- DVGA Docker container: `dvga-graphqlai`
- GraphQL HTTP endpoint: `http://127.0.0.1:5014/graphql`

## Command

```bash
node bin/graphqlai.mjs ^
  --target http://127.0.0.1:5014/graphql ^
  --schema validation/dvga/runs/20260421-162023/introspection.json ^
  --scope-file validation/dvga/runs/20260421-162023/scope.yaml ^
  --max-requests 220 ^
  --timeout-ms 20000 ^
  --concurrency 2 ^
  --max-rps 2 ^
  --variable-strategy thorough ^
  --output-dir validation/dvga/runs/20260421-162023
```

## Outcome

- Executed HTTP requests: **67**
- Findings: **21**

## Signal distribution (high level)

- **14** × `Sensitive pattern in body preview`
- **6** × `Transport/timeout`
- **1** × `jwt_or_bearer_leak`
