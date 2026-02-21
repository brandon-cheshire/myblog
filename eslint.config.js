import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const backendFiles = ['packages/myblog-backend/**/*.{js,mjs,cjs,ts}']
const frontendFiles = ['packages/myblog-frontend/**/*.{ts,tsx}']

export default defineConfig([
  globalIgnores(['node_modules/**', 'dist/**', 'packages/myblog-backend/**/*.js']),
  {
    files: backendFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
  { ...js.configs.recommended, files: backendFiles },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: backendFiles })),
  {
    files: frontendFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  { ...js.configs.recommended, files: frontendFiles },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: frontendFiles })),
  { ...reactHooks.configs['recommended-latest'], files: frontendFiles },
  { ...reactRefresh.configs.vite, files: frontendFiles },
  {
    files: [...backendFiles, ...frontendFiles],
    rules: {
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      indent: ['error', 2],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
])
