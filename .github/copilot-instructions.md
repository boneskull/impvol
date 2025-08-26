# Copilot Instructions for impvol

## Repository Summary

**impvol** is a TypeScript/Node.js package that provides "Importable Volume" functionality - a drop-in replacement for `memfs`'s Volume that allows importing scripts and modules from virtual filesystems using Node.js module loader hooks. It's a dual ESM/CJS package requiring Node.js v20.0.0+ and memfs v4.0.0+.

**Repository size**: Small (~25 files), **Languages**: TypeScript (primary), JavaScript (config), **Framework**: Node.js with custom module loaders, **Build tool**: tshy, **Test runner**: Node.js built-in test runner

## Build Instructions

### Environment Setup

- **Required Node.js version**: v20.0.0+ (as specified in package.json engines)
- **Package manager**: npm (package-lock.json present)
- **Always run `npm ci --foreground-scripts` before any build/test operations** - this is critical for the husky git hooks setup

### Command Sequence

1. **Install dependencies**: `npm ci --foreground-scripts` (30-60 seconds)
2. **Build**: `npm run build` (uses tshy, <5 seconds)
3. **Type check**: `npm run tsc` (<10 seconds)
4. **Lint**: `npm run lint` (<10 seconds)
5. **Test**: `npm test` (<5 seconds)

### Additional Validation Commands

- `npm run lint:knip` - Detect unused exports/dependencies (<5 seconds)
- `npm run lint:md` - Markdown linting (<5 seconds)
- `npm run lint:spelling` - Spell check with cspell (<10 seconds)
- `npm run format -- --list-different` - Check Prettier formatting (<5 seconds)

### Build Artifacts

- **Output directory**: `dist/` (contains both `esm/` and `commonjs/` subdirectories)
- **Clean build**: Delete `dist/` directory before running `npm run build`
- **Build generates**: .js, .d.ts, .js.map, .d.ts.map files for dual ESM/CJS compatibility

### Important Build Notes

- **Always clean build before testing changes**: `rm -rf dist/ && npm run build`
- **tshy must complete before linting** for file system-dependent lint rules
- **Never run `tsc` directly** - use `npm run tsc` to avoid wrong output locations
- **Build is required before testing** since tests import from built files
- **All validation steps pass in CI** - failing checks indicate real issues

## Project Layout

### Source Code Architecture

- **Main entry**: `src/index.ts` - exports everything from impvol.ts and types.ts
- **Core implementation**: `src/impvol.ts` - ImportableVolume class extending memfs Volume
- **Module hooks**: `src/impvol-hooks.ts` - custom Node.js module loader implementation
- **Path utilities**: `src/paths.ts` & `src/paths-cjs.cts` - platform-specific path handling
- **Type definitions**: `src/types.ts` - ImpVolInitData interface

### Configuration Files (Repository Root)

- **package.json**: Main project config with comprehensive script definitions and tool configs
- **tsconfig.json**: TypeScript config for development
- **tsconfig.tsc.json**: TypeScript config for type checking only
- **eslint.config.js**: ESLint configuration with TypeScript, stylistic, and node plugin rules
- **cspell.json**: Spell checking dictionary and ignored paths
- **.prettierignore**: Prettier exclusions
- **.gitignore**: Standard Node.js gitignore plus dist/ and .tshy\* directories

### GitHub Workflows & CI

**All workflows trigger on push to main and pull requests. Each uses `.github/actions/prepare` which runs `npm ci --foreground-scripts`.**

Key validation workflows:

- **test.yml**: Runs on Node.js 20,22 × Ubuntu/Windows matrix
- **build.yml**: Verifies `npm run build` succeeds
- **lint.yml**: Runs `npm run lint`
- **tsc.yml**: Runs `npm run tsc` for type checking
- **prettier.yml**: Runs `npm run format -- --list-different`
- **lint-markdown.yml**: Runs `npm run lint:md`
- **lint-spelling.yml**: Runs `npm run lint:spelling`
- **lint-knip.yml**: Runs `npm run lint:knip`

### Test Structure

- **Test directory**: `test/`
- **Test files**: `test/impvol.spec.ts` - comprehensive tests using Node.js built-in test runner
- **Test command**: `node --test --import tsx ./test/impvol.spec.ts`
- **Test imports**: Tests import from `src/` (not built files) due to tsx transpilation

### Dependencies & Memory Considerations

- **Peer dependency**: memfs v4.0.0+ (required)
- **Runtime dependency**: debug for logging
- **Known limitation**: ImportableVolume instances create worker threads that cannot be terminated, causing memory leaks
- **Custom protocol**: Uses `impvol://` URLs for virtual filesystem imports

### Git Hooks & Code Quality

- **Husky**: Git hooks for pre-commit validation
- **lint-staged**: Runs prettier, cspell, markdownlint, and eslint on staged files
- **Commitlint**: Enforces conventional commit format
- **Multiple lint levels**: Syntax (ESLint), style (Prettier), spelling (cspell), unused code (knip), markdown (markdownlint)

### Documentation Files

- **README.md**: Main documentation with usage examples and requirements
- **CHANGELOG.md**: Auto-generated release notes via release-please
- **.github/CONTRIBUTING.md**: Contribution guidelines requiring conventional commits
- **.github/DEVELOPMENT.md**: Local development setup instructions

### Key Package.json Scripts

```json
{
  "build": "tshy",
  "test": "node --test --import tsx ./test/impvol.spec.ts",
  "lint": "eslint . --max-warnings 0",
  "tsc": "tsc -p tsconfig.tsc.json",
  "format": "prettier .",
  "lint:knip": "knip",
  "lint:md": "markdownlint-cli2 \"**/*.md\" \".github/**/*.md\"",
  "lint:spelling": "cspell \"**\" \".github/**/*\""
}
```

## Important Agent Guidelines

**Trust these instructions first** - only perform additional searches if information here is incomplete or found to be incorrect. This codebase has been thoroughly analyzed and all commands have been validated.

**Always follow this sequence for changes:**

1. `npm ci --foreground-scripts` (if node_modules missing)
2. Make code changes
3. `npm run build` (required before most validation)
4. `npm run tsc && npm run lint && npm test` (core validation)
5. Run additional lint commands as needed for specific changes

**Common failure patterns to avoid:**

- Skipping build step before linting/testing
- Running `tsc` directly instead of `npm run tsc`
- Forgetting to install dependencies with `--foreground-scripts` flag
- Making changes without understanding memory leak implications of worker threads
