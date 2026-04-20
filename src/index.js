/**
 * Programmatic API (optional).
 */

export { runCampaign } from './pipeline/runCampaign.js';
export { loadIntrospectionFromFile, normalizeIntrospectionSchema } from './schema/introspectionLoader.js';
export { compileOperationToRequestBody, buildVariableBindings } from './schema/queryCompiler.js';
export { expandVariableVariants } from './schema/variableDefaults.js';
export { buildCampaignCases } from './schema/hypothesisEngine.js';
export { inferMutationToQueryEdges, buildMutationFollowUpCases } from './schema/campaignPlanner.js';
