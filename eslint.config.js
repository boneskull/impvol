import stylistic from '@stylistic/eslint-plugin';
import eslint from '@eslint/js';
import n from 'eslint-plugin-n';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'package-lock.json', '**/*.snap'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  n.configs['flat/recommended'],
  ...tseslint.config({
    extends: tseslint.configs.recommendedTypeChecked,
    plugins: {
      '@stylistic': stylistic,
    },
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          allowDefaultProjectForFiles: ['./*.*s', 'eslint.config.js'],
          defaultProject: './tsconfig.json',
        },
      },
    },
    rules: {
      'no-use-before-define': 'off',

      'n/no-unpublished-import': 'off',

      // I like my template expressions, tyvm
      '@typescript-eslint/restrict-template-expressions': 'off',

      // and sometimes you gotta use any
      '@typescript-eslint/no-explicit-any': 'off',

      // these 6 bytes add up
      '@typescript-eslint/require-await': 'off',

      // HATE IT
      '@typescript-eslint/no-non-null-assertion': 'off',

      // this rule seems broken
      '@typescript-eslint/no-invalid-void-type': 'off',

      '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
        'error',
        {
          allowComparingNullableBooleansToTrue: true,
          allowComparingNullableBooleansToFalse: true,
        },
      ],
      '@typescript-eslint/unified-signatures': [
        'error',
        {
          ignoreDifferentlyNamedParameters: true,
        },
      ],
      // too many false positives
      '@typescript-eslint/no-unnecessary-condition': 'off',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],

      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@stylistic/lines-around-comment': [
        'warn',
        {
          beforeBlockComment: true,
          // these conflict with prettier, so we must allow them
          allowObjectStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          allowBlockStart: true,
          allowArrayStart: true,
          allowTypeStart: true,
        },
      ],

      '@stylistic/semi': ['error', 'always'],

      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'export' },
      ],

      '@stylistic/lines-between-class-members': 'error',
    },
  }),
  {
    files: ['*.jsonc'],
    rules: {
      'jsonc/comma-dangle': 'off',
      'jsonc/no-comments': 'off',
      'jsonc/sort-keys': 'error',
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['**/*.md/*.ts'],
    rules: {
      'n/no-missing-import': ['error', { allowModules: ['impvol'] }],
    },
  },
);
