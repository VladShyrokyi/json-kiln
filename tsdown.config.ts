import { defineConfig } from 'tsdown';

// Конфіг максимально близький до попереднього tsup: ESM-тільки, CLI банер, декларації.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  dts: true,
  format: ['esm'],
  target: 'node18',
  clean: true,
  minify: false,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
