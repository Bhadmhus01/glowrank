import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

// Flat config (ESLint 10). Lint-only — formatting is owned by Prettier (eslint-config-prettier
// disables any stylistic rules that would conflict). Type-aware rules are intentionally NOT
// enabled: `tsc --noEmit` already does full type checking in CI, so this stays fast.
export default tseslint.config(
  {
    ignores: ['node_modules', 'coverage', 'dist', '.vercel', '.husky', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // TypeScript already resolves identifiers; the core rule false-positives on Node/Web globals.
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Tests mock SDKs and poke at loosely-typed mock internals — relax the strictest rules here.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
)
