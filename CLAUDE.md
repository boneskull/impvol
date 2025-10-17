# impvol - Importable Volume Library

## Repository Overview

**impvol** is a dual ESM/CJS npm package that allows importing scripts and modules from memfs virtual filesystems in Node.js. It provides a drop-in replacement for `memfs`'s `Volume` class with the ability to import modules directly from virtual filesystems using Node.js customization hooks.

- **Type**: Dual ESM/CJS npm package for Node.js
- **Size**: Small (~6 TypeScript source files, 1 test file)
- **Target Runtime**: Node.js 20.0.0+
- **Build Tool**: tshy (TypeScript dual-package builder)
- **Key Dependencies**: memfs (peer dependency), debug
- **Architecture**: Uses Node.js module loader hooks running in worker threads

## Critical Setup Sequence

**Always run commands in this order:**

```bash
npm install   # Required first - installs deps and sets up Husky hooks
npm run build # Must run before knip linting (requires built files)
npm test      # Can run without building (tsx handles TypeScript)
```

## Essential Commands

### Testing

```bash
npm test # Node.js test runner with tsx (runs without build)
```

### Linting (all must pass for CI)

```bash
npm run lint          # ESLint with TypeScript rules
npm run lint:knip     # Unused code/deps detection (REQUIRES BUILD FIRST)
npm run lint:md       # Markdown linting
npm run lint:spelling # Spell checking
npm run tsc           # TypeScript type checking (no emit)
```

### Formatting

```bash
npm run format                     # Check formatting
npm run format -- --write          # Apply formatting
npm run format -- --list-different # CI mode
```

### Complete Validation (matches CI)

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

## Project Structure

### Source Files

- `src/index.ts` - Main entry point, exports everything from impvol.ts
- `src/impvol.ts` - Core `ImportableVolume` class extending memfs `Volume`
- `src/impvol-hooks.ts` - Node.js module loader hooks (resolve/load) for worker threads
- `src/paths.ts` - ESM path resolution utilities
- `src/paths-cjs.cts` - CommonJS path resolution utilities
- `src/types.ts` - TypeScript type definitions

### Build Outputs

- `dist/esm/` - ES modules build output
- `dist/commonjs/` - CommonJS build output
- `dist/node_modules/` - tshy build artifacts

### Configuration

- `package.json` - Scripts, dependencies, tool configurations
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.tsc.json` - TypeScript config for type checking only
- `eslint.config.js` - ESLint configuration with TypeScript rules
- `.editorconfig` - Code style (2 spaces, LF line endings)

## Architecture Details

- **Worker Threads**: Uses Node.js customization hooks in worker threads
- **Dual Package**: ESM/CJS compatibility via tshy
- **Memory Leaks**: Known issue - worker threads cannot be terminated (documented and intentional)
- **Virtual FS**: Intercepts `import()` calls to load from memfs volumes
- **Protocol**: Custom `impvol://` protocol for explicit virtual filesystem imports
- **Import Only**: Only works with `import()`, not `require()`

## Important Quirks & Rules

1. **Memory leaks are EXPECTED** - Don't try to "fix" worker thread termination
2. **Build before knip** - `npm run lint:knip` requires built files
3. **Dual package** - Never manually edit `dist/` files; tshy handles this
4. **@ts-ignore comments** - Used for tshy compatibility in path files (intentional)
5. **Testing scope** - Library is intended for testing only, not production
6. **Spell check** - Add legitimate words to `cspell.json`
7. **Conventional commits** - PR titles must follow conventional commit format
8. **Git hooks** - Pre-commit runs lint-staged, commit-msg validates format

## Common Issues

- **"knip found issues"**: Run `npm run build` first
- **Import errors in tests**: Tests use tsx, don't need pre-built files
- **Worker thread issues**: Memory leaks are expected behavior
- **Path resolution**: Different behavior between ESM/CJS builds

## CI Workflows

All checks must pass:

- `build.yml` - Runs `npm run build`
- `test.yml` - Runs `npm test` on Node.js 20/22 × Ubuntu/Windows matrix
- `lint.yml` - ESLint
- `tsc.yml` - TypeScript type checking
- `prettier.yml` - Formatting check
- `lint-knip.yml` - Unused code detection
- `lint-markdown.yml` - Markdown linting
- `lint-spelling.yml` - Spell checking

## Instructions for AI Assistants

1. Always run `npm install` first when starting
2. Run `npm run build` before any knip linting operations
3. Use the complete validation sequence before proposing changes
4. Check existing tests in `test/impvol.spec.ts` for patterns
5. Follow conventional commit format for PR titles
6. Respect the dual-package architecture
7. Don't try to fix the intentional memory leaks
8. Trust these instructions - only explore when information is incomplete
