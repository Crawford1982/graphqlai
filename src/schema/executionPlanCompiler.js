/**
 * Validates typed `GraphqlExecutionPlan` JSON → FuzzCase[] — Milestone 4 (optional LLM planner output).
 * Raw model text never reaches HTTP without passing through here.
 *
 * @param {Record<string, unknown>} _plan
 * @returns {{ ok: false, errors: string[] }}
 */
export function compileExecutionPlan(_plan) {
  return {
    ok: false,
    errors: ['executionPlanCompiler: not implemented (planned milestone)'],
  };
}
