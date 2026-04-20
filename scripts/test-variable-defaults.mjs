import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import {
  alternateIdsForContext,
  defaultStringForContext,
  expandVariableVariants,
  enumDefaultAndAlternates,
} from '../src/schema/variableDefaults.js';
import { compileOperationToRequestBody } from '../src/schema/queryCompiler.js';

const here = path.dirname(fileURLToPath(import.meta.url));

if (defaultStringForContext({ argName: 'contactEmail' }) !== 'user@example.test') {
  console.error('email default mismatch');
  process.exit(1);
}

const uuidSchema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-uuid-arg-introspection.json'));
const uuidOp = uuidSchema.operations.find((o) => o.fieldName === 'nodeByUuid');
if (!uuidOp) {
  console.error('missing nodeByUuid');
  process.exit(1);
}
const uuidBody = compileOperationToRequestBody(uuidSchema, uuidOp);
if (!String(uuidBody.variables.v0).includes('00000000')) {
  console.error('expected uuid-shaped ID default', uuidBody.variables);
  process.exit(1);
}
const uuidAlts = alternateIdsForContext({ argName: 'uuid' });
if (!uuidAlts.some((s) => s.includes('1111'))) {
  console.error('expected uuid alternate', uuidAlts);
  process.exit(1);
}

const inputSchema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-input-object-introspection.json'));
const createUser = inputSchema.operations.find((o) => o.kind === 'mutation' && o.fieldName === 'createUser');
if (!createUser) {
  console.error('missing createUser');
  process.exit(1);
}

const enums = enumDefaultAndAlternates(inputSchema, 'UserStatus', 'balanced');
if (!enums.includes('ACTIVE') || !enums.includes('INACTIVE')) {
  console.error('enum slice', enums);
  process.exit(1);
}

const variants = expandVariableVariants(inputSchema, createUser, { maxVariants: 4, strategy: 'balanced' });
if (variants.length < 2) {
  console.error('expected enum alternate variant', variants);
  process.exit(1);
}
const statuses = new Set(variants.map((v) => /** @type {{ status?: string }} */ (v.input).status));
if (!statuses.has('ACTIVE') || !statuses.has('INACTIVE')) {
  console.error('expected ACTIVE and INACTIVE in variants', variants);
  process.exit(1);
}

console.log('variable defaults: ok');
