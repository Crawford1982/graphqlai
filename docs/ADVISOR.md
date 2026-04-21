# LLM advisor layer (planned)

graphqlai today is **fully deterministic**: schema compilation, bounded HTTP, regex/signal packs, statistical checks. **Reports must stay evidence-first:** `replayCurl`, JSON rows, `provenance`.

The **optional advisor** described in **`AGENTS.md`** is the Mythos-aligned next step:

1. **Inputs allowed:** compiled schema summaries, capped response previews already in the report, finding list — **no raw secret env**, no unconstrained outbound HTTP from the advisor.
2. **Output shape:** structured JSON validated against a strict schema (risk narrative, suggested next probes, duplication warnings) — **never** executable GraphQL pasted straight into execution without the normal compiler gates.
3. **Placement:** `src/advisor/` — consumes report fragments; **`runCampaign`** stays the orchestration choke point.

Until that ships, **`report.advisor`** in JSON reports shows `status: "not_configured"`. Deterministic findings remain authoritative.

Optional future UI: pipe the same JSON through `scripts/render-report-html.mjs` or add a richer static viewer — still **no server required**.
