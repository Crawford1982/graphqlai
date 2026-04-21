#!/usr/bin/env node

import { parseArgv } from './config.js';
import { runCampaign } from '../pipeline/runCampaign.js';
import { isCiMode, applyCiProfile, resolveExitCode } from './ci.js';
import { resolveAuthBundle } from './authRefs.js';
import { loadScopePolicy } from '../safety/scopePolicy.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { headerPairsToObject } from './headerPairs.js';

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function printHelp() {
  console.log(`
graphqlai — schema-driven GraphQL HTTP fuzzing (authorized targets only)

Usage:
  graphqlai --target <graphql-endpoint-url> --schema <path>
  Schema path: introspection JSON (*.json) or SDL (*.graphql / *.graphqls / *.sdl)

  graphqlai --version   (-V)   print tool and runtime fingerprint

Auth / headers:
  --auth / -a <token>          shorthand for Authorization: Bearer <token>
  --header / -H "Name: value"  extra header (repeat). Full Authorization / API keys / cookies supported.
  --cookie "a=b; c=d"          sets Cookie header when not already set via -H

Scope & safety:
  --scope-file <yaml>          strongly recommended for real targets (see docs/REAL-TARGET-TESTING.md)
  --no-scope-warning           suppress stderr warning when omitting scope (lab only)
  Env: GRAPHQLAI_ALLOW_NO_SCOPE=1 — same as --no-scope-warning

Rate limits (inbound):
  --respect-retry-after        on HTTP 429, honor Retry-After once per request (bounded; see limits)
  --max-429-retries <n>        default 1 when respecting Retry-After
  --max-retry-after-ms <n>     cap wait (default 60000)
`);
}

function printVersion(p) {
  console.log(`graphqlai ${p.version}`);
  console.log(`node ${process.version} ${process.platform}-${process.arch}`);
  console.log('Reports include a provenance block (tool version, Node, declared deps, optional git SHA).');
  console.log('See docs/CONFIDENCE.md');
}

export async function main() {
  let args;
  try {
    args = parseArgv(process.argv);
  } catch (e) {
    console.error((/** @type {Error} */ (e)).message || e);
    process.exit(2);
  }
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (args.version) {
    printVersion(pkg);
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
    maxPayloadVariants: Number.isFinite(args.maxPayloadVariants) ? args.maxPayloadVariants : 2,
    variableStrategy:
      args.variableStrategy === 'thorough' || args.variableStrategy === 'balanced'
        ? args.variableStrategy
        : 'balanced',
    handleReplayBudget: Number.isFinite(args.handleReplayBudget) ? args.handleReplayBudget : 24,
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

  const allowNoScope =
    Boolean(args.noScopeWarning) ||
    process.env.GRAPHQLAI_ALLOW_NO_SCOPE === '1' ||
    /^true$/i.test(String(process.env.GRAPHQLAI_ALLOW_NO_SCOPE || ''));
  if (!args.scopeFile && !allowNoScope && !ci) {
    console.warn(`
[graphqlai] WARNING: running without --scope-file. Only the URL constrains requests; mistakes can send traffic outside your authorization.
  For bounty/real targets use --scope-file (docs/REAL-TARGET-TESTING.md). For labs: --no-scope-warning or GRAPHQLAI_ALLOW_NO_SCOPE=1.
`);
  }

  const extraHeaders = headerPairsToObject(args.extraHeaders);

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
    maxPayloadVariants: /** @type {number} */ (cfg.maxPayloadVariants),
    variableStrategy: /** @type {'balanced'|'thorough'} */ (cfg.variableStrategy),
    handleReplayBudget: /** @type {number} */ (cfg.handleReplayBudget),
    chainBudget: /** @type {number} */ (cfg.chainBudget),
    principalReplayBudget: /** @type {number} */ (cfg.principalReplayBudget),
    batchBudget: /** @type {number} */ (cfg.batchBudget),
    depthBudget: /** @type {number} */ (cfg.depthBudget),
    maxDepth: /** @type {number} */ (cfg.maxDepth),
    toolVersion: pkg.version,
    packageMeta: pkg,
    extraHeaders,
    cookieHeader: args.cookie ? String(args.cookie).trim() || null : null,
    respectRetryAfter: Boolean(args.respectRetryAfter),
    max429Retries: Number.isFinite(args.max429Retries) ? args.max429Retries : 1,
    maxRetryAfterMs: Number.isFinite(args.maxRetryAfterMs) ? args.maxRetryAfterMs : 60000,
  });

  console.log(`\nReport: ${outfile}`);
  console.log(`Executed HTTP requests: ${report.executed}`);
  console.log(`Findings: ${report.findings.length}`);
  const exitCode = resolveExitCode(report, { ci, failOnFindings: Boolean(args.ciFailOnFindings) });
  process.exit(exitCode);
}
