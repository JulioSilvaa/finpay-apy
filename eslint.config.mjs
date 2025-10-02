import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Import sorting and organization
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.config.ts', '*.config.mjs'],
  },
]
