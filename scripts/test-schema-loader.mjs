import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-minimal-introspection.json'));

if (schema.source !== 'introspection_json') {
  console.error('expected introspection_json');
  process.exit(1);
}
if (schema.operations.length !== 1 || schema.operations[0].fieldName !== 'hello') {
  console.error('unexpected operations', schema.operations);
  process.exit(1);
}
console.log('schema loader: ok');
