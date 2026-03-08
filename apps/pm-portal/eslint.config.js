import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    }
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            'senciyo',
            'senciyo/**',
            'apps/senciyo',
            'apps/senciyo/**',
            '**/senciyo',
            '**/senciyo/**',
            '**/apps/senciyo',
            '**/apps/senciyo/**',
          ],
          message: 'PM Portal no puede importar desde SenciYo. Usa packages/* para código compartido.',
        }],
      }],
    },
  },
])
