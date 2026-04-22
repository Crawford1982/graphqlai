#!/usr/bin/env node
/**
 * Build submission-pack/ from an existing graphqlai-report.json (offline).
 *
 * Usage:
 *   node scripts/export-submission-pack.mjs <report.json> [output-dir]
 */

import fs from 'fs';
import path from 'path';

import { buildSubmissionBundlesFromReport } from '../src/submissions/submissionBundles.js';
import { writeSubmissionPackToDir } from '../src/submissions/writeSubmissionPack.js';

const reportPath = process.argv[2];
const outDirArg = process.argv[3];

if (!reportPath) {
  console.error(
    'usage: node scripts/export-submission-pack.mjs <graphqlai-report.json> [output-dir]'
  );
  process.exit(1);
}

const abs = path.resolve(reportPath);
const report = JSON.parse(fs.readFileSync(abs, 'utf8'));
const bundles = buildSubmissionBundlesFromReport(report);

const defaultOut = path.join(
  path.dirname(abs),
  `${path.basename(abs, '.json')}-submission-pack`
);
const outDir = outDirArg ? path.resolve(outDirArg) : defaultOut;

writeSubmissionPackToDir(outDir, bundles, {
  report,
  reportPath: abs,
  target: String(report.target || ''),
  generatedAt: String(report.generatedAt || new Date().toISOString()),
  toolVersion: String(report.toolVersion || '0.2.0'),
});

console.log(`Wrote submission pack (${bundles.length} bundles): ${outDir}`);
console.log(`  → ${path.join(outDir, 'INDEX.md')}`);
