# Parallel track: bounty report craft (separate from tool validation)

DVGA + `graphqlai` validate **GraphQL-shaped evidence pipelines** — not “every bug.” The tool stays **narrow and surgical by design** (`docs/POSITIONING.md`).

Bug bounty outcomes also depend on **program rules, impact, reproducibility narrative, and triage norms**, and often include **non-GraphQL** issues — skills that do not substitute for graphqlai benchmarks and do not validate this tool against REST-heavy programs.

**Recommended split study**

- **Tool track:** `docs/DVGA-VALIDATION.md`, `docs/REGRESSION.md`, `validation/dvga/knowledge/scenario-checklist.json`
- **Bounty track:** read **disclosed** HackerOne reports for structure (title, steps, impact, remediation) — not as ground truth that your tool “finds the same bugs” on arbitrary targets.

Keep the two lanes separate to avoid confusing **heuristic lab noise** with **paid report quality**.
