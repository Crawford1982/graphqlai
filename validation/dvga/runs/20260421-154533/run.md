# DVGA validation run — 20260421-154533

## Target

- DVGA Docker image: `dolevf/dvga:latest`
- Container name: `dvga-graphqlai`
- Host mapping: `127.0.0.1:5014 -> container :5013` (host port **5013** was already taken)
- GraphQL HTTP endpoint: `http://127.0.0.1:5014/graphql`

## Artifacts

- `scope.yaml` — allowlist for `localhost` / `127.0.0.1` and `/graphql`
- `introspection.json` — live introspection snapshot (UTF-8 **no BOM**; BOM breaks `JSON.parse` in Node)
- `graphqlai-report-*.json` — tool output (findings + replay curls)
- `console.txt` — CLI stdout/stderr from `graphqlai`

## graphqlai summary

- Executed HTTP requests: **73**
- Findings: **32**

## Notes for next validation pass

- Prefer writing JSON/YAML via UTF-8 **without BOM** on Windows (PowerShell `Set-Content -Encoding utf8` adds BOM by default).
