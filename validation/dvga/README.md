# DVGA Validation Workspace

This folder tracks GraphQL-only validation runs of `graphqlai` against DVGA.

## Structure

- `notes/feedback-log.md` - run-by-run notes on signal quality
- `runs/` - raw artifacts from each execution

## Run naming

Use UTC timestamp folders in `runs/`:

- `YYYYMMDD-HHMMSS/`

Each run folder should contain:

- `introspection.json` (schema snapshot used for that run)
- `scope.yaml` (scope policy used)
- `graphqlai-report-*.json` (tool output)
- `run.md` (manual confirmation notes)
