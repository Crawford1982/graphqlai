/**
 * Write submission pack: manifest, index, per-finding JSON + SUBMISSION.md + shell stubs.
 */

import fs from 'fs';
import path from 'path';

/**
 * @param {string} dir
 * @param {import('./submissionBundles.js').SubmissionBundleV1[]} bundles
 * @param {{
 *   report: Record<string, unknown>,
 *   reportPath: string,
 *   target: string,
 *   generatedAt: string,
 *   toolVersion: string,
 * }} meta
 */
export function writeSubmissionPackToDir(dir, bundles, meta) {
  fs.mkdirSync(dir, { recursive: true });

  const manifest = {
    schemaVersion: '1.0.0',
    generator: 'graphqlai',
    toolVersion: meta.toolVersion,
    generatedAt: meta.generatedAt,
    sourceReport: path.resolve(meta.reportPath),
    target: meta.target,
    bundleCount: bundles.length,
    schemaUrl: 'schemas/submission-bundle.schema.json',
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const indexLines = [
    `# Submission pack`,
    ``,
    `- **Target:** ${meta.target}`,
    `- **Source report:** \`${meta.reportPath}\``,
    `- **Generated:** ${meta.generatedAt}`,
    `- **Bundles:** ${bundles.length}`,
    ``,
    `| # | Ready | Category | Title |`,
    `|---|-------|----------|-------|`,
  ];

  for (let i = 0; i < bundles.length; i++) {
    const b = bundles[i];
    const folder = path.join(dir, b.id);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'bundle.json'), JSON.stringify(b, null, 2), 'utf8');

    const md = renderSubmissionMarkdown(b, meta);
    fs.writeFileSync(path.join(folder, 'SUBMISSION.md'), md, 'utf8');

    if (b.evidenceA?.replayCurl && b.evidencePairKind === 'two_principals') {
      fs.writeFileSync(
        path.join(folder, 'repro-primary.sh'),
        shellStub(b.evidenceA.replayCurl, 'Primary principal'),
        'utf8'
      );
    }
    if (b.evidenceB?.replayCurl && b.evidencePairKind === 'two_principals') {
      fs.writeFileSync(
        path.join(folder, 'repro-alternate.sh'),
        shellStub(b.evidenceB.replayCurl, 'Alternate principal'),
        'utf8'
      );
    }
    if (b.evidenceA?.replayCurl && b.evidencePairKind !== 'two_principals') {
      fs.writeFileSync(
        path.join(folder, 'repro-single.sh'),
        shellStub(b.evidenceA.replayCurl, 'Single request'),
        'utf8'
      );
    }

    indexLines.push(
      `| ${i + 1} | ${b.submissionReady ? '**yes**' : 'no'} | ${b.category} | [${escapeMdCell(b.title)}](./${b.id}/SUBMISSION.md) |`
    );
  }

  indexLines.push(
    ``,
    `## How to use`,
    ``,
    `1. Open each **SUBMISSION.md** — fill **Impact** and **Program-specific notes** (placeholders included).`,
    `2. Treat \`submissionReady: true\` as **minimum bar**, not acceptance — triagers decide.`,
    `3. Never submit raw tokens; replace **[REDACTED]** placeholders with your authorized test accounts only.`,
    ``,
    `---`,
    `*Deterministic pack — no LLM. graphqlai findings remain hypotheses until you validate.*`,
    ``
  );

  fs.writeFileSync(path.join(dir, 'INDEX.md'), indexLines.join('\n'), 'utf8');
}

/**
 * @param {string} curl
 * @param {string} label
 */
function shellStub(curl, label) {
  return `#!/usr/bin/env sh
# ${label} — review before running; authorized targets only.
set -e
${curl.split(' \\\n').join(' \\\n')}
`;
}

/**
 * @param {string} s
 */
function escapeMdCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * @param {import('./submissionBundles.js').SubmissionBundleV1} b
 * @param {{ target: string }} meta
 */
function renderSubmissionMarkdown(b, meta) {
  const lines = [
    `# ${b.title}`,
    ``,
    `## Classification`,
    ``,
    `- **Category (heuristic):** ${b.category}`,
    `- **Severity hint (tool):** ${b.severityHint ?? '—'}`,
    `- **Readiness:** ${b.readiness}`,
    `- **Submission-ready (conservative):** ${b.submissionReady ? '**yes** — still verify manually.' : '**no**'}`,
    `- **Why:** ${b.submissionReadyReason}`,
    `- **Confidence (0–1):** ${b.confidence != null ? b.confidence : '—'}`,
    `- **Payout triage score (1–10):** ${b.payoutCorrelationScore ?? '—'}`,
    ``,
    `## Summary for triagers`,
    ``,
    `> **Diff / observation:** ${b.diffSummary}`,
    ``,
    `### Impact (you complete)`,
    ``,
    `- What asset or data class is affected?`,
    `- Who can exploit it (auth level)?`,
    `- Business risk in one sentence.`,
    ``,
    `## Evidence`,
    ``,
  ];

  if (b.evidencePairKind === 'two_principals') {
    lines.push(`### Principal A (primary)`, evidenceSection(b.evidenceA), ``);
    lines.push(`### Principal B (alternate)`, evidenceSection(b.evidenceB), ``);
  } else {
    lines.push(`### Request / response`, evidenceSection(b.evidenceA), ``);
  }

  lines.push(
    `## Operator checklist`,
    ``,
    ...b.operatorChecklist.map((x) => `- [ ] ${x}`),
    ``,
    `## Escalation / next probes`,
    ``,
    ...b.escalationHints.map((x) => `- ${x}`),
    ``,
    `## Reproduction`,
    ``,
    b.repro.notes,
    ``,
    `- Shell stubs: see \`repro-*.sh\` in this folder (if present).`,
    ``,
    `## Program & ethics`,
    ``,
    `- ${b.programNotes.scope}`,
    `- ${b.programNotes.redaction}`,
    ``,
    `---`,
    `**Target:** \`${meta.target}\`  `,
    `**Bundle id:** \`${b.id}\`  `,
    `**Source finding index:** ${b.source.findingIndex}`,
    ``
  );

  return lines.join('\n');
}

/**
 * @param {import('./submissionBundles.js').EvidencePacket|null} ev
 */
function evidenceSection(ev) {
  if (!ev) return '_No row attached._';
  const parts = [
    `- **caseId:** \`${ev.caseId ?? '—'}\``,
    `- **HTTP status:** ${ev.status ?? '—'}`,
    `- **elapsed (ms):** ${ev.elapsedMs ?? '—'}`,
    ``,
    `**GraphQL errors (if any):**`,
    ev.graphqlErrorMessages?.length
      ? ev.graphqlErrorMessages.map((m) => `> ${m}`).join('\n')
      : '_None parsed._',
    ``,
    `**Body preview (truncated, redacted):**`,
    ``,
    '```',
    ev.bodyPreviewSnippet || '—',
    '```',
    ``,
    `**replayCurl (redacted):**`,
    ``,
    '```bash',
    ev.replayCurl || '# unavailable',
    '```',
    ``,
  ];
  return parts.join('\n');
}
