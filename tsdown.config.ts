import { defineConfig, UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
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

export default config;
