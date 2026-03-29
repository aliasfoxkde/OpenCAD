import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Map @opencad/* to the parent src/ directory
      '@opencad': path.resolve(__dirname, '../src'),
    },
  },
});
