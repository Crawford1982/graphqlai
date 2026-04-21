/**
 * Validates stress anomaly logic against synthetic "API personas" (offline — no HTTP).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeStressProbeAnomalies } from '../src/verify/stressAnomalies.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '../validation/stress-validation');

for (const name of ['persona-apollo-batch.json', 'persona-ruby-batch.json', 'persona-depth-ramp.json']) {
  const p = path.join(dir, name);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const hits = analyzeStressProbeAnomalies(doc.results || []);
  if (!hits.length) {
    console.error(`persona ${name}: expected ≥1 stress_anomaly finding`, hits);
    process.exit(1);
  }
  console.log(`${name}: ok (${hits.length} stress rows)`);
}

console.log('stress personas: ok');
