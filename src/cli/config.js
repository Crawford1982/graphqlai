export function parseArgv(argv) {
  const args = {
    target: null,
    schemaPath: null,
    auth: null,
    authEnv: null,
    authAlt: null,
    authAltEnv: null,
    principalReplayBudget: 12,
    handleReplayBudget: 24,
    chainBudget: 8,
    batchBudget: 8,
    depthBudget: 8,
    maxDepth: 5,
    concurrency: 4,
    maxRequests: 120,
    timeoutMs: 8000,
    outputDir: 'output',
    scopeFile: null,
    maxRps: 0,
    maxResponseBodyChars: undefined,
    ci: false,
    ciFailOnFindings: false,
    ciRequireScope: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--target' || a === '-t') args.target = argv[++i];
    else if (a === '--schema' || a === '-s') args.schemaPath = argv[++i];
    else if (a === '--auth' || a === '-a') args.auth = argv[++i];
    else if (a === '--auth-env') args.authEnv = argv[++i];
    else if (a === '--auth-alt') args.authAlt = argv[++i];
    else if (a === '--auth-alt-env') args.authAltEnv = argv[++i];
    else if (a === '--principal-replay-budget') args.principalReplayBudget = Number(argv[++i]);
    else if (a === '--handle-replay-budget') args.handleReplayBudget = Number(argv[++i]);
    else if (a === '--chain-budget') args.chainBudget = Number(argv[++i]);
    else if (a === '--batch-budget') args.batchBudget = Number(argv[++i]);
    else if (a === '--depth-budget') args.depthBudget = Number(argv[++i]);
    else if (a === '--max-depth') args.maxDepth = Number(argv[++i]);
    else if (a === '--concurrency' || a === '-c') args.concurrency = Number(argv[++i]);
    else if (a === '--max-requests') args.maxRequests = Number(argv[++i]);
    else if (a === '--timeout-ms') args.timeoutMs = Number(argv[++i]);
    else if (a === '--output-dir') args.outputDir = argv[++i];
    else if (a === '--scope-file') args.scopeFile = argv[++i];
    else if (a === '--max-rps') args.maxRps = Number(argv[++i]);
    else if (a === '--max-response-chars') args.maxResponseBodyChars = Number(argv[++i]);
    else if (a === '--ci') args.ci = true;
    else if (a === '--ci-fail-on-findings') args.ciFailOnFindings = true;
    else if (a === '--ci-require-scope') args.ciRequireScope = true;
  }
  return args;
}
