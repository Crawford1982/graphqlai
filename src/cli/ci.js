/**
 * CI-friendly caps (deterministic, conservative).
 */

/**
 * @param {{ ci?: boolean }} args
 * @param {{ GRAPHQLAI_CI?: string }} [env]
 */
export function isCiMode(args, env = process.env) {
  if (args && /** @type {Record<string, unknown>} */ (args).ci === true) return true;
  const v = env.GRAPHQLAI_CI;
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @param {Record<string, unknown>} cfg
 */
export function applyCiProfile(cfg) {
  cfg.concurrency = Math.min(Number(cfg.concurrency) || 2, 2);
  cfg.maxRequests = Math.min(Number(cfg.maxRequests) || 48, 48);
  cfg.timeoutMs = Math.min(Number(cfg.timeoutMs) || 5000, 8000);
  const mr = Number(cfg.maxRps);
  cfg.maxRps = !Number.isFinite(mr) || mr === 0 ? 12 : Math.min(mr, 20);
  cfg.chainBudget = Math.min(Number(cfg.chainBudget) || 4, 8);
  cfg.handleReplayBudget = Math.min(Number(cfg.handleReplayBudget) || 16, 24);
  cfg.principalReplayBudget = Math.min(Number(cfg.principalReplayBudget) || 8, 12);
  cfg.batchBudget = Math.min(Number(cfg.batchBudget) || 4, 8);
  cfg.depthBudget = Math.min(Number(cfg.depthBudget) || 4, 8);
  cfg.maxDepth = Math.min(Math.max(Number(cfg.maxDepth) || 4, 2), 6);
}

/**
 * @param {{ findings?: unknown[] }} report
 * @param {{ ci?: boolean, failOnFindings?: boolean }} opts
 */
export function resolveExitCode(report, opts = {}) {
  if (!opts.ci || !opts.failOnFindings) return 0;
  const findings = Array.isArray(report.findings) ? report.findings : [];
  return findings.length > 0 ? 2 : 0;
}
