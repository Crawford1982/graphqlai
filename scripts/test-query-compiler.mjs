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
