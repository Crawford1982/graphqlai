/**
 * Signal pipeline — regex bounty signals only (REST-specific invariant checkers intentionally omitted).
 */

import { loadBountySignals, matchBountyBattery } from './bountyBattery.js';

/**
 * @param {unknown[]} execResults
 * @param {{ evidenceHarPath?: string | null }} ctx
 */
export function runSignalPipeline(execResults, ctx = {}) {
  const pack = loadBountySignals();
  const hits = matchBountyBattery(execResults, pack);

  /** @type {Array<Record<string, unknown>>} */
  const fired = [];

  for (const f of hits) {
    fired.push({
      ...f,
      kind: 'bounty_signal',
      checkerId: `signal:${f.signalId}`,
      owaspMapping: [],
      bountyTierHint: mapSeverityToTier(String(f.severity)),
      evidenceHarPath: ctx.evidenceHarPath ?? null,
    });
  }

  return fired;
}

/**
 * @param {string} s
 */
function mapSeverityToTier(s) {
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  return 'low';
}
