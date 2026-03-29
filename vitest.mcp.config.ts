import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['mcp-server/tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@opencad': path.resolve(__dirname, 'src'),
    },
  },
});
