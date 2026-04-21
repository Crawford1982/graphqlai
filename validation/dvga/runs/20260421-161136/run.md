# DVGA validation run — 20260421-161136

## Goal

Repeat the first successful `graphqlai` pass with **lower concurrency**, **higher timeouts**, and a small **global RPS cap** to reduce `Transport/timeout` noise against DVGA.

## Target

- Same DVGA container as prior run:
  - `dvga-graphqlai`
  - `127.0.0.1:5014/graphql`

## Command

```bash
node bin/graphqlai.mjs ^
  --target http://127.0.0.1:5014/graphql ^
  --schema validation/dvga/runs/20260421-161136/introspection.json ^
  --scope-file validation/dvga/runs/20260421-161136/scope.yaml ^
  --max-requests 220 ^
  --timeout-ms 20000 ^
  --concurrency 2 ^
  --max-rps 2 ^
  --output-dir validation/dvga/runs/20260421-161136
```

## Outcome

- Executed HTTP requests: **67**
- Findings: **19**

## Observed signal mix (high level)

- Timeout findings dropped materially vs run `20260421-154533`.
- Majority of remaining findings were **sensitive-pattern** style body previews (expected on DVGA).
