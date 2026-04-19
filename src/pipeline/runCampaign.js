import fs from 'fs';
import path from 'path';

import { ObservationLog } from '../model/observationLog.js';
import { executeCases, ensureOutputDir } from '../net/httpAgent.js';
import { NoveltyIndex } from '../signals/noveltyIndex.js';
import { triageResults } from '../verify/triage.js';
import { attachEvidenceCurls } from '../verify/evidencePack.js';
import { buildTransportOpts } from '../safety/executorContext.js';
import { buildBaselineFingerprints } from '../verify/baseline.js';
import { enrichFindingsWithConfidence } from '../verify/confidence.js';
import { enrichFindingsWithStatistics } from '../verify/statsSignals.js';
import { minimizationHint } from '../verify/minimize.js';
import { runSignalPipeline } from '../verify/checkerPipeline.js';
import { GRAPHQLAI_CHECKERS } from '../verify/checkerRegistry.js';
import { checkCrossPrincipalOverlap } from '../verify/principalReplay.js';

import { loadIntrospectionFromFile } from '../schema/introspectionLoader.js';
import { buildCampaignCases } from '../schema/hypothesisEngine.js';
import { probeGraphqlEndpoint } from '../schema/surfaceProbe.js';
import { hintsVerboseGraphqlErrors } from '../schema/leakHeuristics.js';
import { buildMutationFollowUpCases, inferMutationToQueryEdges } from '../schema/campaignPlanner.js';
import { buildBatchAliasCases, buildDepthLadderCases } from '../schema/stressProbes.js';

function stripReplayBlob(r) {
  if (!r || typeof r !== 'object' || !('fullBody' in r)) return r;
  const { fullBody: _fb, ...rest } = /** @type {Record<string, unknown>} */ (r);
  return rest;
}

export async function runCampaign(cfg) {
  const log = new ObservationLog();
  const index = new NoveltyIndex();
  const schema = loadIntrospectionFromFile(cfg.schemaPath);

  const edges = inferMutationToQueryEdges(schema);
  log.push({ kind: 'introspection_loaded', operationCount: schema.operations.length, chainEdgeCount: edges.length });

  const transport = buildTransportOpts({
    timeoutMs: cfg.timeoutMs,
    authHeader: cfg.auth ?? null,
    scopePolicy: cfg.scopePolicy ?? null,
    maxRps: cfg.maxRps ?? 0,
  });

  const previewCap = Number.isFinite(cfg.maxResponseBodyChars) ? cfg.maxResponseBodyChars : 8192;
  const bodyRead = { maxBodyPreviewChars: previewCap };
  const authHeaderNorm = cfg.auth ? (cfg.auth.startsWith('Bearer ') ? cfg.auth : `Bearer ${cfg.auth}`) : null;
  const authAltHeaderNorm = cfg.authAlt
    ? cfg.authAlt.startsWith('Bearer ')
      ? cfg.authAlt
      : `Bearer ${cfg.authAlt}`
    : null;

  const surface = await probeGraphqlEndpoint(cfg.target, {
    timeoutMs: cfg.timeoutMs,
    authHeader: authHeaderNorm,
    scopePolicy: cfg.scopePolicy ?? null,
    rateLimiter: transport.rateLimiter,
  });
  log.push({ kind: 'surface_probed', probeCount: surface.probes.length, introspectionResponseLikely: surface.introspectionResponseLikely });

  let cases = buildCampaignCases(schema, cfg.target, { maxRequests: Math.max(1, cfg.maxRequests || 120) });
  const execResults = await executeCases(cases, { ...transport, ...bodyRead, concurrency: cfg.concurrency });
  const casesById = new Map(cases.map((c) => [c.id, c]));

  const chainCases = buildMutationFollowUpCases(
    execResults,
    casesById,
    schema,
    cfg.target,
    Math.max(0, Number(cfg.chainBudget || 0))
  );
  if (chainCases.length) {
    const chainResults = await executeCases(chainCases, { ...transport, ...bodyRead, concurrency: cfg.concurrency });
    cases = [...cases, ...chainCases];
    execResults.push(...chainResults);
  }

  const batchCases = buildBatchAliasCases(
    cases,
    Math.max(0, Number(cfg.batchBudget || 0))
  );
  if (batchCases.length) {
    const batchResults = await executeCases(batchCases, { ...transport, ...bodyRead, concurrency: cfg.concurrency });
    cases = [...cases, ...batchCases];
    execResults.push(...batchResults);
  }

  const depthCases = buildDepthLadderCases(
    schema,
    cfg.target,
    Math.max(0, Number(cfg.depthBudget || 0)),
    Math.max(2, Number(cfg.maxDepth || 5))
  );
  if (depthCases.length) {
    const depthResults = await executeCases(depthCases, { ...transport, ...bodyRead, concurrency: cfg.concurrency });
    cases = [...cases, ...depthCases];
    execResults.push(...depthResults);
  }

  if (authAltHeaderNorm && Number(cfg.principalReplayBudget || 0) > 0) {
    const candidates = cases
      .filter((c) => c.family === 'GRAPHQL_QUERY' || c.family === 'GRAPHQL_MUTATION')
      .slice(0, Math.max(0, Number(cfg.principalReplayBudget || 0)))
      .map((c) => ({ ...c, id: `${c.id}:authAlt`, family: 'GRAPHQL_AUTH_ALT_REPLAY' }));
    if (candidates.length) {
      const altResults = await executeCases(candidates, {
        ...transport,
        ...bodyRead,
        concurrency: cfg.concurrency,
        authHeader: authAltHeaderNorm,
      });
      cases = [...cases, ...candidates];
      execResults.push(...altResults);
    }
  }

  for (const r of execResults) {
    const row = /** @type {Record<string, unknown>} */ (r);
    if (!row.bodyPreview && !row.status) continue;
    const key = index.noveltyKey(row.status ?? 'err', String(row.bodyPreview || ''));
    index.score(key);
  }

  const casesMap = new Map(cases.map((c) => [c.id, c]));
  const resultsWithEvidence = attachEvidenceCurls(execResults, casesMap, { authHeader: cfg.auth || null });
  const sanitizedResults = resultsWithEvidence.map(stripReplayBlob);
  const sanitizedRaw = execResults.map(stripReplayBlob);

  const baselines = buildBaselineFingerprints(execResults);
  let findings = triageResults(execResults);
  findings = [...findings, ...runSignalPipeline(execResults, { evidenceHarPath: null })];
  findings = [...findings, ...checkCrossPrincipalOverlap(execResults)];

  for (const r of execResults) {
    const row = /** @type {Record<string, unknown>} */ (r);
    for (const line of hintsVerboseGraphqlErrors(String(row.bodyPreview || ''))) {
      findings.push({
        kind: 'graphql_signal',
        severity: 'low',
        title: 'Verbose GraphQL error pattern',
        detail: line,
        caseId: row.caseId,
      });
    }
  }

  findings = enrichFindingsWithConfidence(findings, execResults, baselines).map((f) => ({
    ...f,
    minimization: f.kind === 'bounty_signal' ? null : minimizationHint(casesMap.get(f.caseId)),
  }));
  findings = enrichFindingsWithStatistics(findings, execResults);

  const ts = Date.now();
  const report = {
    tool: 'graphqlai',
    toolVersion: cfg.toolVersion || '0.2.0',
    generatedAt: new Date(ts).toISOString(),
    target: cfg.target,
    mode: 'graphql_campaign_v2',
    schemaPath: path.resolve(cfg.schemaPath),
    limits: {
      maxRequests: cfg.maxRequests,
      concurrency: cfg.concurrency,
      timeoutMs: cfg.timeoutMs,
      maxRps: cfg.maxRps ?? 0,
      scopePolicy: Boolean(cfg.scopePolicy),
      maxResponseBodyChars: previewCap,
      chainBudget: cfg.chainBudget ?? 0,
      principalReplayBudget: cfg.principalReplayBudget ?? 0,
      batchBudget: cfg.batchBudget ?? 0,
      depthBudget: cfg.depthBudget ?? 0,
      maxDepth: cfg.maxDepth ?? 5,
    },
    checkerRegistry: GRAPHQLAI_CHECKERS,
    surfaceSummary: {
      graphqlProbes: surface.probes.length,
      statuses: surface.probes.map((p) => p.status),
      introspectionResponseLikely: surface.introspectionResponseLikely,
    },
    observationLog: log.snapshot(),
    dependencyGraph: { mutationToQueryEdges: edges },
    executed: execResults.length,
    findings,
    results: sanitizedResults,
    raw: sanitizedRaw,
  };

  const outDir = ensureOutputDir(cfg.outputDir);
  const outfile = path.join(outDir, `graphqlai-report-${ts}.json`);
  fs.writeFileSync(outfile, JSON.stringify(report, null, 2));
  return { outfile, report };
}
