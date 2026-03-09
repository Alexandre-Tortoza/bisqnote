import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    name: 'app/files-to-lint',
    files: ['src/**/*.ts'],
  },

  {
    ignores: ['dist/**', 'coverage/**'],
  },

  ...tseslint.configs.recommended,
)
