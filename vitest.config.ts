import { defineConfig } from 'vitest/config'


export default defineConfig({

  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@config': '/src/config',
      '@shared': '/src/shared',
      '@infrastructure': '/src/infrastructure',
      '@presentation': '/src/presentation',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.config.ts',
      ],
    },
  },
})
