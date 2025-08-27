# Copilot Instructions for impvol

## Repository Overview

**impvol** is an "Importable Volume" library that allows importing scripts and modules from memfs virtual filesystems in Node.js. It provides a drop-in replacement for `memfs`'s `Volume` class with the special ability to import modules directly from the virtual filesystem using Node.js customization hooks.

**High-Level Repository Information:**

- **Type**: Dual ESM/CJS npm package for Node.js
- **Size**: Small repository (~6 TypeScript source files, 1 test file)
- **Languages**: TypeScript (compiles to JavaScript)
- **Target Runtime**: Node.js 20.0.0+
- **Build Tool**: tshy (TypeScript dual-package builder)
- **Key Dependencies**: memfs (peer dependency), debug
- **Architecture**: Uses Node.js module loader hooks running in worker threads

## Build and Validation Instructions

### Environment Setup

**ALWAYS run these commands in this exact order:**

1. **Install dependencies** (required before any other command):

   ```bash
   npm install
   ```

   - Installs dependencies and sets up Husky git hooks
   - Must be run first after cloning

2. **Build the project**:

   ```bash
   npm run build
   ```

   - Uses tshy to compile TypeScript to dual ESM/CJS outputs in `dist/`
   - **Must be run before certain lint checks** (knip dependency analysis)
   - Outputs: `dist/esm/` and `dist/commonjs/` directories

### Testing

```bash
npm test
```

- Uses Node.js built-in test runner with tsx for TypeScript
- **Can run without building** (tsx handles TypeScript on-the-fly)
- Currently has 4 test cases in `test/impvol.spec.ts`
- Runs quickly (~300ms)

### Linting and Code Quality

**Run all of these commands to match CI:**

```bash
npm run lint          # ESLint with TypeScript rules
npm run lint:knip     # Detects unused code/dependencies (requires build)
npm run lint:md       # Markdown linting
npm run lint:spelling # Spell checking across all files
npm run tsc           # TypeScript type checking (no emit)
```

### Formatting

```bash
npm run format                     # Format all files with Prettier
npm run format -- --write          # Apply formatting changes
npm run format -- --list-different # Check if formatting is needed (CI mode)
```

### Complete Validation Sequence

To ensure your changes will pass CI, run this sequence:

```bash
npm install
npm run build
npm run lint
npm run lint:knip
npm run lint:md
npm run lint:spelling
npm run tsc
npm test
npm run format -- --list-different
```

## Project Layout and Architecture

### Source Structure

- **`src/index.ts`**: Main entry point, exports everything from `impvol.ts`
- **`src/impvol.ts`**: Core `ImportableVolume` class extending memfs `Volume`
- **`src/impvol-hooks.ts`**: Node.js module loader hooks (resolve/load) for worker threads
- **`src/paths.ts`**: ESM path resolution utilities
- **`src/paths-cjs.cts`**: CommonJS path resolution utilities
- **`src/types.ts`**: TypeScript type definitions

### Build Outputs

- **`dist/esm/`**: ES modules build output
- **`dist/commonjs/`**: CommonJS build output
- **`dist/node_modules/`**: tshy build artifacts

### Configuration Files

- **`package.json`**: Contains scripts, dependencies, and tool configurations
- **`tsconfig.json`**: Main TypeScript configuration
- **`tsconfig.tsc.json`**: TypeScript config for type checking only (extends main)
- **`eslint.config.js`**: ESLint configuration with TypeScript rules
- **`.editorconfig`**: Code style settings (2 spaces, LF line endings)

### Git Hooks (Husky)

- **Pre-commit**: Runs `lint-staged` (formatting + linting on staged files)
- **Commit-msg**: Validates conventional commit format

## Continuous Integration

The repository has comprehensive GitHub Actions workflows that run on every PR and push to main:

### Build & Test Workflows

- **build.yml**: Runs `npm run build`
- **test.yml**: Runs `npm test` on Node.js 20/22 × Ubuntu/Windows matrix

### Code Quality Workflows

- **lint.yml**: Runs `npm run lint` (ESLint)
- **tsc.yml**: Runs `npm run tsc` (TypeScript type checking)
- **prettier.yml**: Runs `npm run format -- --list-different`
- **lint-knip.yml**: Runs `npm run lint:knip` (unused code detection)
- **lint-markdown.yml**: Runs `npm run lint:md`
- **lint-spelling.yml**: Runs `npm run lint:spelling`

### Validation Steps for PRs

All checks must pass. The CI uses these exact commands:

1. `npm ci --foreground-scripts` (clean install)
2. Individual workflow commands as listed above

## Key Dependencies and Architecture

### Runtime Dependencies

- **Node.js 20.0.0+**: Required (specified in engines)
- **memfs 4.0.0+**: Peer dependency (virtual filesystem)
- **debug**: Internal debugging utility

### Architecture Details

- **Worker Threads**: Uses Node.js customization hooks in worker threads
- **Dual Package**: ESM/CJS compatibility via tshy
- **Memory Leaks**: Known issue - worker threads cannot be terminated (documented)
- **Virtual FS**: Intercepts `import()` calls to load from memfs volumes

### Important Quirks

- Uses `@ts-ignore` comments for tshy compatibility in path files
- Worker threads create memory leaks (intended for testing only)
- Only works with `import()`, not `require()`
- Custom protocol: `impvol://` for explicit virtual filesystem imports

## Common Issues and Workarounds

### Build Issues

- **"knip found issues"**: Run `npm run build` first - knip needs built files
- **TypeScript errors**: Check `tsconfig.json` and `tsconfig.tsc.json` alignment
- **Dual package issues**: tshy handles ESM/CJS, don't modify output manually

### Test Issues

- **Import errors**: Tests use tsx, don't need pre-built files
- **Worker thread issues**: Memory leaks are expected behavior
- **Path resolution**: Different behavior between ESM/CJS builds

### Lint Issues

- **Spell check failures**: Add words to `cspell.json` if legitimate
- **Markdown lint**: Check `.markdownlint-cli2` config in `package.json`
- **ESLint TypeScript**: Configuration in `eslint.config.js` is quite strict

## File Locations Reference

**Root Files:**

- `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`
- `tsconfig.json`, `tsconfig.tsc.json`
- `eslint.config.js`, `.editorconfig`, `.gitignore`
- `cspell.json`, `.nvmrc`, `.npmrc`

**GitHub Files:**

- `.github/workflows/` - All CI workflows
- `.github/actions/prepare/` - Shared CI setup action
- `.github/CONTRIBUTING.md`, `.github/DEVELOPMENT.md` - Documentation

**Git Hooks:**

- `.husky/pre-commit`, `.husky/commit-msg`

## Instructions for Coding Agents

1. **Always run `npm install` first** after cloning or when dependencies change
2. **Run `npm run build` before knip linting** - it requires built files for analysis
3. **Use the complete validation sequence** before proposing changes
4. **Check existing tests** in `test/impvol.spec.ts` for patterns when adding tests
5. **Follow conventional commit format** for PR titles (enforced by commitlint)
6. **Respect the dual-package architecture** - don't manually edit `dist/` files
7. **Memory leaks are expected** - don't try to "fix" the worker thread termination issue
8. **Trust these instructions** - only search/explore if information is incomplete or incorrect

The codebase is well-maintained with comprehensive linting and testing. Follow the established patterns and validation steps for the best results.
