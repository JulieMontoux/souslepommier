import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**'],
      exclude: [
        'src/pdf/**',
        'src/index.ts',
        // Complex DB orchestration — requires integration tests, not unit tests
        'src/lib/compute-cloture.ts',
        'src/lib/compute-stats.ts',
        'src/lib/create-vente.ts',
        'src/lib/prisma.ts',
        'src/lib/auto-cloture.ts',
      ],
      thresholds: {
        'src/lib/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
        // Note: functions threshold lower because vi.mock of middleware module
        // leaves the inline route-handler closures untraced by v8 (mock returns
        // bypass the original arrow). Line/branch/statement targets reflect
        // real behavior coverage.
        'src/routes/**': { lines: 85, functions: 75, branches: 75, statements: 85 },
      },
    },
  },
})
