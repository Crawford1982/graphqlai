#!/usr/bin/env node
/**
 * Static HTML view of a graphqlai JSON report (no server; open file in browser).
 * Usage: node scripts/render-report-html.mjs <path-to-graphqlai-report.json>
 * Output: same basename with .html next to the JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const infile = process.argv[2];
if (!infile) {
  console.error('Usage: node scripts/render-report-html.mjs <graphqlai-report.json>');
  process.exit(1);
}

const raw = fs.readFileSync(infile, 'utf8');
const report = JSON.parse(raw);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const findings = Array.isArray(report.findings) ? report.findings : [];
const results = Array.isArray(report.results) ? report.results : [];
const curlByCase = new Map(
  results.map((r) => [r.caseId, typeof r.replayCurl === 'string' ? r.replayCurl : ''])
);

const rows = findings
  .map((f, i) => {
    const score = f.payoutCorrelationScore != null ? esc(f.payoutCorrelationScore) : '—';
    const axes = Array.isArray(f.bountyAxes) ? esc(f.bountyAxes.join(', ')) : '';
    const rawCurl = curlByCase.get(f.caseId) || '';
    const curl =
      typeof rawCurl === 'string'
        ? esc(rawCurl.slice(0, 2000)) + (rawCurl.length > 2000 ? '…' : '')
        : '';
    return `<tr><td>${i + 1}</td><td>${esc(f.kind)}</td><td>${score}</td><td>${esc(
      f.title
    )}</td><td>${axes}</td><td><pre>${curl}</pre></td></tr>`;
  })
  .join('\n');

const outfile = infile.replace(/\.json$/i, '') + '.html';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>graphqlai report ${esc(report.generatedAt)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;line-height:1.4;max-width:120ch}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:.4rem .5rem;vertical-align:top}
th{background:#f4f4f4}
pre{white-space:pre-wrap;font-size:.75rem;margin:0}
.meta{color:#444;font-size:.9rem}
.warning{background:#fff8e6;padding:.75rem;border-radius:6px;margin:1rem 0}
</style>
</head>
<body>
<h1>graphqlai report</h1>
<p class="meta">Target: <strong>${esc(report.target)}</strong><br/>
Generated: ${esc(report.generatedAt)} · Tool ${esc(report.toolVersion)} · Findings ${findings.length}</p>
<div class="warning"><strong>Note:</strong> Heuristic rankings and scores are triage aids only. Validate impact and program scope before submitting.</div>
<h2>Summary</h2>
<pre>${esc(JSON.stringify(report.rateLimitSummary || {}, null, 2))}</pre>
<pre>${esc(JSON.stringify(report.transport || {}, null, 2))}</pre>
<pre>${esc(JSON.stringify(report.advisor || {}, null, 2))}</pre>
<h2>Findings (${findings.length})</h2>
<table>
<thead><tr><th>#</th><th>kind</th><th>payoutΔ</th><th>title</th><th>axes</th><th>replay (truncated)</th></tr></thead>
<tbody>
${rows || '<tr><td colspan="6">No findings</td></tr>'}
</tbody>
</table>
<p class="meta">Full JSON source: ${esc(path.basename(infile))}</p>
</body></html>`;

fs.writeFileSync(outfile, html, 'utf8');
console.log(`Wrote ${outfile}`);
