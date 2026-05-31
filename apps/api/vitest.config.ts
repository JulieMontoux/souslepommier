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
      ],
      thresholds: {
        'src/lib/**': { lines: 85, functions: 85, branches: 80, statements: 85 },
      },
    },
  },
})
