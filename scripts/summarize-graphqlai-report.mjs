#!/usr/bin/env node
/**
 * Summarize a graphqlai JSON report (offline): finding title histogram,
 * executed request count, and results[] counts by family.
 *
 * Usage:
 *   node scripts/summarize-graphqlai-report.mjs path/to/graphqlai-report-*.json
 */

import fs from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/summarize-graphqlai-report.mjs <report.json>');
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(path, 'utf8'));

/** @type {Record<string, number>} */
const fam = {};
for (const r of j.results || []) {
  const k = r.family || 'UNKNOWN';
  fam[k] = (fam[k] || 0) + 1;
}

/** @type {Record<string, number>} */
const titles = {};
for (const f of j.findings || []) {
  const t = f.title || 'UNKNOWN';
  titles[t] = (titles[t] || 0) + 1;
}

console.log(JSON.stringify({ report: path, executed: j.executed, findings: (j.findings || []).length, titles, fam }, null, 2));
