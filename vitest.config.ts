import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { pool: 'threads', maxWorkers: 1, environment: 'jsdom', setupFiles: ['tests/support/setup.ts'], include: ['tests/sprints/**/*.test.{ts,tsx}'], restoreMocks: true },
});
