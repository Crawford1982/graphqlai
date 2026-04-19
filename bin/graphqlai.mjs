#!/usr/bin/env node

import { main } from '../src/cli/main.js';

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
