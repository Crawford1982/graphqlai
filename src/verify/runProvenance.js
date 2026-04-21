/**
 * Embeds reproducibility metadata into JSON reports (no secrets; safe to share with triagers).
 */

/**
 * @param {Record<string, unknown>} [pkg]
 * @param {Record<string, string | undefined>} [env]
 */
export function buildReportProvenance(pkg = {}, env = process.env) {
  const deps =
    pkg && typeof pkg.dependencies === 'object' && pkg.dependencies
      ? /** @type {Record<string, string>} */ (pkg.dependencies)
      : {};

  return {
    schemaVersion: 1,
    graphqlaiVersion: typeof pkg.version === 'string' ? pkg.version : null,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    /** True when common CI env vars are set (GitHub Actions, GitLab CI, etc.). */
    ci: Boolean(env.CI || env.CONTINUOUS_INTEGRATION),
    /**
     * Commit SHA when running in GitHub Actions (`GITHUB_SHA`) or override `GRAPHQLAI_GIT_SHA`.
     * Null when unknown (typical local runs or npm-installed CLI).
     */
    gitSha: pickGitSha(env),
    dependencyVersionsDeclared: {
      graphql: deps.graphql ?? null,
      'js-yaml': deps['js-yaml'] ?? null,
    },
    note:
      'Fingerprint for debugging and disclosure packets — not a security guarantee. Findings remain hypotheses until manually validated.',
  };
}

/**
 * @param {Record<string, string | undefined>} env
 */
function pickGitSha(env) {
  const g = env.GRAPHQLAI_GIT_SHA || env.GITHUB_SHA || env.COMMIT_SHA || '';
  const s = String(g).trim();
  if (/^[a-f0-9]{7,40}$/i.test(s)) return s.toLowerCase();
  return null;
}
