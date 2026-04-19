#!/usr/bin/env node

import { parseArgv } from './config.js';
import { runCampaign } from '../pipeline/runCampaign.js';
import { isCiMode, applyCiProfile, resolveExitCode } from './ci.js';
import { resolveAuthBundle } from './authRefs.js';
import { loadScopePolicy } from '../safety/scopePolicy.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function printHelp() {
  console.log(`
graphqlai — schema-driven GraphQL HTTP fuzzing (authorized targets only)

Usage:
  graphqlai --target <graphql-endpoint-url> --schema <introspection.json>
`);
}

export async function main() {
  const args = parseArgv(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  const ci = isCiMode(args);
  if (!args.target || !args.schemaPath) {
    console.error('Error: --target and --schema are required');
    process.exit(1);
  }
  if (ci && args.ciRequireScope && !(args.scopeFile && String(args.scopeFile).trim())) {
    console.error('Error: --ci-require-scope requires --scope-file');
    process.exit(1);
  }

  /** @type {Record<string, unknown>} */
  const cfg = {
    target: args.target,
    schemaPath: args.schemaPath,
    concurrency: Number.isFinite(args.concurrency) ? args.concurrency : 4,
    maxRequests: Number.isFinite(args.maxRequests) ? args.maxRequests : 120,
    timeoutMs: Number.isFinite(args.timeoutMs) ? args.timeoutMs : 8000,
    outputDir: args.outputDir || 'output',
    maxRps: Number.isFinite(args.maxRps) ? args.maxRps : 0,
    maxResponseBodyChars: Number.isFinite(args.maxResponseBodyChars) ? args.maxResponseBodyChars : undefined,
    chainBudget: Number.isFinite(args.chainBudget) ? args.chainBudget : 8,
    principalReplayBudget: Number.isFinite(args.principalReplayBudget) ? args.principalReplayBudget : 12,
    batchBudget: Number.isFinite(args.batchBudget) ? args.batchBudget : 8,
    depthBudget: Number.isFinite(args.depthBudget) ? args.depthBudget : 8,
    maxDepth: Number.isFinite(args.maxDepth) ? args.maxDepth : 5,
  };
  if (ci) applyCiProfile(cfg);

  let authBundle;
  try {
    authBundle = resolveAuthBundle(args);
  } catch (e) {
    console.error((/** @type {Error} */ (e)).message || e);
    process.exit(1);
  }

  let scopePolicy = null;
  if (args.scopeFile) {
    try {
      scopePolicy = loadScopePolicy(args.scopeFile, args.target);
    } catch (e) {
      console.error((/** @type {Error} */ (e)).message || e);
      process.exit(1);
    }
  }

  const { outfile, report } = await runCampaign({
    target: String(cfg.target),
    schemaPath: String(cfg.schemaPath),
    auth: authBundle.auth,
    authAlt: authBundle.authAlt,
    concurrency: /** @type {number} */ (cfg.concurrency),
    maxRequests: /** @type {number} */ (cfg.maxRequests),
    timeoutMs: /** @type {number} */ (cfg.timeoutMs),
    outputDir: String(cfg.outputDir),
    scopePolicy,
    maxRps: /** @type {number} */ (cfg.maxRps),
    maxResponseBodyChars: /** @type {number|undefined} */ (cfg.maxResponseBodyChars),
    chainBudget: /** @type {number} */ (cfg.chainBudget),
    principalReplayBudget: /** @type {number} */ (cfg.principalReplayBudget),
    batchBudget: /** @type {number} */ (cfg.batchBudget),
    depthBudget: /** @type {number} */ (cfg.depthBudget),
    maxDepth: /** @type {number} */ (cfg.maxDepth),
    toolVersion: pkg.version,
  });

  console.log(`\nReport: ${outfile}`);
  console.log(`Executed HTTP requests: ${report.executed}`);
  console.log(`Findings: ${report.findings.length}`);
  const exitCode = resolveExitCode(report, { ci, failOnFindings: Boolean(args.ciFailOnFindings) });
  process.exit(exitCode);
}
