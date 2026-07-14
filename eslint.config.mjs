import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  // Flat config doesn't inherit next.js's legacy .eslintignore defaults, so
  // without this, ESLint walks into pnpm's node_modules/.pnpm store and lints
  // vendored library code (next, lucide-react, supabase-js, etc.) as if it
  // were project source.
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // These rules flag long-standing style debt (any usage, CJS requires,
    // unescaped JSX text, ts-comment suppressions) across ~190 files. Erroring
    // on all of them at once blocks CI on unrelated pre-existing code rather
    // than the change being reviewed, so they're downgraded to warnings
    // instead of being fixed en masse. Real-bug-risk rules are left as errors.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'react/no-unescaped-entities': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  {
    // Playwright test fixtures use `async (_, use) => ...` as their own
    // fixture-callback convention (test.extend). react-hooks' rules-of-hooks
    // rule matches any function literally named `use` and misreads this as a
    // misused React hook — it isn't; these files aren't React components.
    files: ['tests/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
]

export default eslintConfig
