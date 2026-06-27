import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'api/**/*.ts'],
      // Stubs and pure type modules carry no testable logic.
      exclude: ['src/types/**', 'src/**/*.d.ts'],
    },
  },
})
