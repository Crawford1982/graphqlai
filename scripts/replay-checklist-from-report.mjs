#!/usr/bin/env node
/**
 * Replay one graphqlai replayCurl per checklist caseIds (offline parse + fetch).
 * Usage: node scripts/replay-checklist-from-report.mjs <report.json>
 */

import fs from 'fs';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: node scripts/replay-checklist-from-report.mjs <graphqlai-report.json>');
  process.exit(1);
}

/** @param {string} curl */
function parseBodyFromReplayCurl(curl) {
  const marker = "--data '";
  const i = curl.indexOf(marker);
  if (i === -1) throw new Error('replayCurl missing --data payload');
  const rest = curl.slice(i + marker.length);
  const q = rest.lastIndexOf("'");
  if (q <= 0) throw new Error('replayCurl missing closing quote');
  const jsonStr = rest.slice(0, q);
  return JSON.parse(jsonStr);
}

/** @param {string} curl */
function parseUrlFromReplayCurl(curl) {
  const m = curl.match(/-X\s+'POST'\s+'([^']+)'/);
  if (!m) throw new Error('replayCurl missing POST URL');
  return m[1];
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
/** @type {Record<string, unknown>} */
const byId = {};
for (const r of report.results || []) {
  byId[r.caseId] = r;
}

const themes = [
  {
    key: 'batch',
    caseId: 'gql:query:users:pv0:batch',
    verdictNotes: 'Batch/array POST body; DVGA batching exercise',
  },
  {
    key: 'depth',
    caseId: 'gql:depth:pastes:2:0',
    verdictNotes: 'Depth ladder probe',
  },
  {
    key: 'jwt',
    caseId: 'gql:mutation:login:pv1',
    verdictNotes: 'login mutation — tokens in response',
  },
  {
    key: 'injection_heuristic',
    caseId: 'gql:mutation:createUser:pv0',
    verdictNotes: 'High-signal body preview heuristic row',
  },
  {
    key: 'timeout',
    caseId: 'gql:query:systemUpdate',
    verdictNotes: 'Often hits timeout budget on DVGA',
  },
];

/** @type {Record<string, { ok: boolean, status?: number, ms?: number, preview?: string, error?: string }>} */
const out = {};

for (const t of themes) {
  const row = byId[t.caseId];
  if (!row?.replayCurl) {
    out[t.key] = { ok: false, error: `missing row or replayCurl for ${t.caseId}` };
    continue;
  }
  try {
    const url = parseUrlFromReplayCurl(row.replayCurl);
    const body = parseBodyFromReplayCurl(row.replayCurl);
    const t0 = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    const ms = Date.now() - t0;
    out[t.key] = {
      ok: true,
      status: res.status,
      ms,
      preview: text.slice(0, 400),
    };
  } catch (e) {
    out[t.key] = { ok: false, error: String(/** @type {Error} */ (e).message || e) };
  }
}

console.log(JSON.stringify({ reportPath, replays: out }, null, 2));
