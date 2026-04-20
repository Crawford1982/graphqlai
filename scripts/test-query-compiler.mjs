import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import { compileOperationToRequestBody } from '../src/schema/queryCompiler.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-minimal-introspection.json'));

const body = compileOperationToRequestBody(schema, schema.operations[0]);
if (!body.query.includes('hello')) {
  console.error(body);
  process.exit(1);
}
if (Object.keys(body.variables).length) {
  console.error('expected no variables');
  process.exit(1);
}
console.log('query compiler: ok');

const inputSchema = loadIntrospectionFromFile(
  path.join(here, '../fixtures/example-input-object-introspection.json')
);
const createUser = inputSchema.operations.find((o) => o.kind === 'mutation' && o.fieldName === 'createUser');
if (!createUser) {
  console.error('missing createUser op');
  process.exit(1);
}
const mutBody = compileOperationToRequestBody(inputSchema, createUser);
const v0 = mutBody.variables.v0;
if (!v0 || typeof v0 !== 'object' || Array.isArray(v0)) {
  console.error('expected input object variable', mutBody.variables);
  process.exit(1);
}
const obj = /** @type {Record<string, unknown>} */ (v0);
if (typeof obj.name !== 'string' || typeof obj.status !== 'string') {
  console.error('expected nested object with enum/string fields', obj);
  process.exit(1);
}
console.log('query compiler input object: ok');

const chains = loadIntrospectionFromFile(path.join(here, '../fixtures/example-chains-introspection.json'));
const projectOp = chains.operations.find((o) => o.kind === 'query' && o.fieldName === 'project');
if (!projectOp) {
  console.error('missing project op');
  process.exit(1);
}
const projBody = compileOperationToRequestBody(chains, projectOp);
if (!projBody.query.includes('project(') || !projBody.query.includes('$v0')) {
  console.error(projBody.query);
  process.exit(1);
}
if (!projBody.query.includes(' id') && !projBody.query.includes('\nid')) {
  console.error('expected schema-aware scalar selection', projBody.query);
  process.exit(1);
}
console.log('query compiler schema selection: ok');
