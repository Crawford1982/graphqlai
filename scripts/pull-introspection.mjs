#!/usr/bin/env node
/**
 * Pull GraphQL introspection JSON from an endpoint (authorized targets only).
 *
 * Usage:
 *   node scripts/pull-introspection.mjs <graphql-url> <output.json>
 *   GRAPHQLAI_TOKEN=... node scripts/pull-introspection.mjs https://api.example.com/graphql ./schema.json
 *
 * Writes the raw HTTP JSON body (typically { data: { __schema: ... } }) — same shape graphqlai accepts as --schema.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const queryPath = path.join(__dirname, '..', 'data', 'introspection-query.graphql');

const target = process.argv[2];
const outPath = process.argv[3];
const token = process.env.GRAPHQLAI_TOKEN || process.env.AUTH_TOKEN || '';

if (!target || !outPath) {
  console.error('usage: node scripts/pull-introspection.mjs <graphql-url> <output.json>');
  process.exit(1);
}

const query = fs.readFileSync(queryPath, 'utf8');
const body = JSON.stringify({ query });

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
if (token) {
  headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

const res = await fetch(target, { method: 'POST', headers, body });
const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error('Non-JSON response:', text.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error(`HTTP ${res.status}`, json);
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8');
console.log(`Wrote ${outPath}`);
