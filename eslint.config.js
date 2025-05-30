import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import n from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
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
  perfectionist.configs['recommended-natural'],
  n.configs['flat/recommended'],
  ...tseslint.config({
    extends: tseslint.configs.recommendedTypeChecked,
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '.*.js'],
        },
        // this is OK because we are only running lint under Node.js v22+
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/lines-around-comment': [
        'warn',
        {
          allowArrayStart: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          // these conflict with prettier, so we must allow them
          allowObjectStart: true,
          allowTypeStart: true,
          beforeBlockComment: true,
        },
      ],

      '@stylistic/lines-between-class-members': 'error',

      '@stylistic/padding-line-between-statements': [
        'error',
        {blankLine: 'always', next: 'export', prev: '*'},
      ],

      '@stylistic/semi': ['error', 'always'],

      '@typescript-eslint/consistent-type-exports': [
        'error',
        {fixMixedExportsWithInlineTypeSpecifier: true},
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],

      // and sometimes you gotta use any
      '@typescript-eslint/no-explicit-any': 'off',

      // this rule seems broken
      '@typescript-eslint/no-invalid-void-type': 'off',

      // HATE IT
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
        'error',
        {
          allowComparingNullableBooleansToFalse: true,
          allowComparingNullableBooleansToTrue: true,
        },
      ],
      // too many false positives
      '@typescript-eslint/no-unnecessary-condition': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // these 6 bytes add up
      '@typescript-eslint/require-await': 'off',

      // I like my template expressions
      '@typescript-eslint/restrict-template-expressions': 'off',

      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      '@typescript-eslint/unified-signatures': [
        'error',
        {
          ignoreDifferentlyNamedParameters: true,
        },
      ],

      // seems to be incompatible with tshy
      'n/no-extraneous-import': 'off',

      'n/no-unpublished-import': 'off',

      'no-use-before-define': 'off',
    },
  }),
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
