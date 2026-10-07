import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Root-level build/tooling config files run in Node, not the browser, so
    // they legitimately use process.env (e.g. the production payment-key guard
    // in vite.config.js).
    files: ['*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    // The server directory is `Backend/` (capital B) in this repository. The
    // original glob only listed lowercase `backend/**`, and ESLint flat-config
    // globs are case-sensitive, so this override never applied: every server
    // file was linted with BROWSER globals and reported `process`, `Buffer`,
    // `__dirname` etc. as undefined. That made lint output on payment code
    // untrustworthy, burying real defects under hundreds of false positives.
    // Both casings are listed so the override holds on case-sensitive
    // filesystems (Linux CI) and case-insensitive ones (the Windows checkout).
    files: ['Backend/**/*.{js,jsx}', 'backend/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Server code is not a React tree; these React-specific rules are
      // inherited from the shared config above and cannot apply here.
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
