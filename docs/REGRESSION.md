# Pre-change regression (graphqlai + DVGA)

Use this when changing **GraphQL compilation, probes, triage, or HTTP transport** —keeping the tool **precise** for GraphQL endpoints (see **`docs/POSITIONING.md`**). Before merging meaningful changes:

1. **Start DVGA** locally (Docker) on a known port, e.g. `127.0.0.1:5014/graphql` mapped to container `5013`.

2. **Create a new folder** under `validation/dvga/runs/<YYYYMMDD-HHmmss>/`.

3. **Copy** `introspection.json` and `scope.yaml` from a pinned baseline (same as canonical profile), e.g. from `validation/dvga/runs/20260421-161136/`.

4. **Run the canonical command** documented in `docs/DVGA-VALIDATION.md` (recommended default profile).

5. **Compare** the new `graphqlai-report-*.json` to the pinned references:
   - `validation/dvga/runs/20260421-161136/graphqlai-report-1776787989524.json`
   - `validation/dvga/runs/20260421-170949/graphqlai-report-1776791489128.json`

   Use:

   ```bash
   node scripts/summarize-graphqlai-report.mjs validation/dvga/runs/<run>/graphqlai-report-*.json
   ```

   **Expect “same ballpark”:** finding *title* histogram shape and `results[].family` counts should be stable. **Exact** `executed` counts may drift slightly because **`GRAPHQL_HANDLE_REPLAY`** is data-dependent.

6. **Optional evidence pass:** replay representative curls:

   ```bash
   node scripts/replay-checklist-from-report.mjs validation/dvga/runs/<run>/graphqlai-report-*.json
   ```

7. Always run **`npm test`** (offline) before pushing.
