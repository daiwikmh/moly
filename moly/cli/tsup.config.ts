import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    bin: 'src/bin.ts',
    'server/index': 'src/server/index.ts',
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
