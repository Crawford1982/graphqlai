import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sdlPath = path.join(here, '../fixtures/example-minimal-sdl.graphql');

const schema = loadIntrospectionFromFile(sdlPath);
if (schema.operations.length < 1 || !schema.operations.some((o) => o.fieldName === 'hello')) {
  console.error('SDL load: expected hello query', schema.operations);
  process.exit(1);
}

const jsonPath = path.join(here, '../fixtures/example-minimal-introspection.json');
const fromJson = loadIntrospectionFromFile(jsonPath);
if (fromJson.operations.length < 1) {
  console.error('JSON load failed');
  process.exit(1);
}

console.log('sdl loader: ok');
