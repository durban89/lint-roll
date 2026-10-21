import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Bundles the rule tests into a plain node script so they can run without a
 * test framework. `pnpm test` builds and executes it.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(process.cwd(), '.') },
  },
  build: {
    ssr: true,
    outDir: '.test-build',
    emptyOutDir: true,
    lib: {
      entry: 'tests/rules.test.ts',
      formats: ['es'],
      fileName: 'rules.test',
    },
    minify: false,
    target: 'node22',
  },
});
