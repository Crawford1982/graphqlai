# Manual schema inputs (when live introspection is unavailable)

graphqlai **`--schema`** expects JSON that **`loadIntrospectionFromFile`** understands:

- Full GraphQL HTTP response: `{ "data": { "__schema": { ... } } }`
- Or a document whose root has **`__schema`** (saved introspection object)

When you **cannot** call introspection from the running API (blocked, outage, policy):

## Option A — Save introspection offline once

Use any trusted client that can introspect when permitted, then reuse the saved file:

```bash
npm run regression:introspect -- https://api.example.com/graphql ./schemas/prod-introspection.json
# or
GRAPHQLAI_TOKEN=eyJ… node scripts/pull-introspection.mjs https://api.example.com/graphql ./schemas/prod-introspection.json
```

Query document: `data/introspection-query.graphql`.

## Option B — SDL checked into the repo / vendor export

Maintain a **`schema.graphql`** (or `.graphqls`) and pass it directly:

```bash
graphqlai --target … --schema ./schemas/api.graphql --scope-file ./scope.yaml
```

graphqlai converts SDL → introspection-shaped model internally using `graphql`’s `buildSchema` + `introspectionFromSchema`.

## Option C — Vendor / CI export as JSON

Export schema from GraphiQL / InQL / Apollo Studio / pipeline artifact as **`__schema` JSON**, save as `--schema`.

## Option D — Lab snapshot

Reuse a pinned snapshot from **`validation/dvga/runs/*/introspection.json`** style files for regression only (not for unauthorized targets).

## Deprecated note

Older docs referred to “SDL not implemented”; **SDL files are now supported** on `--schema`. What remains advanced is rich partial-SDL merges and federation stitching — still out of scope unless explicitly added later.
