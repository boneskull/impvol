/* eslint-disable n/no-missing-import */
/**
 * Implements custom hooks for importing from virtual file systems
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import {fromBinarySnapshotSync} from 'memfs/lib/snapshot/binary.js';
import {Volume} from 'memfs/lib/volume.js';
import {readFileSync} from 'node:fs';
import {
  type InitializeHook,
  type LoadHook,
  type ModuleFormat,
  type ModuleSource,
  type ResolveHook,
} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {type ImpVolInitData} from './types.js';

const debug = Debug('impvol:hooks');

const PROTOCOL = 'impvol';

let vol: undefined | Volume;

/**
 * Gets or sets & gets the {@link vol} singleton
 *
 * @returns The {@link vol} singleton
 */
function getVolume(): Volume {
  return vol ?? (vol = new Volume());
}

let tmp: string;
let uint8: Uint8Array;

export const initialize: InitializeHook<ImpVolInitData> = ({
  sab,
  tmp: _tmp,
}) => {
  tmp = _tmp;
  uint8 = new Uint8Array(sab);
};

/**
 * @todo Test WASM
 */
const DISALLOWED_FORMATS = new Set(['builtin']);

function guessFormat(specifier: string): ModuleFormat | undefined {
  const ext = path.extname(specifier);
  switch (ext) {
    case '.cjs':
      return 'commonjs';
    case '.json':
      return 'json';
    case '.mjs':
      return 'module';
    case '.wasm':
      return 'wasm';
    default:
      return undefined;
  }
}

function shouldReload(): boolean {
  return Atomics.load(uint8, 0) !== 0;
}

function reload() {
  const buffer = readFileSync(tmp);
  const cbor = new Uint8Array(buffer);
  const vol = getVolume();
  vol.reset();
  // XXX: memfs needs to re-export type CborUint8Array
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  fromBinarySnapshotSync(cbor as any, {fs: vol});
  Atomics.store(uint8, 0, 0);
  debug('Reloaded snapshot from %s', tmp);
}

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  const start = performance.now();
  if (shouldReload()) {
    reload();
  }

  if (specifier.startsWith(`${PROTOCOL}://`)) {
    const format = guessFormat(new URL(specifier).pathname);
    return {
      format,
      shortCircuit: true,
      url: specifier,
    };
  }

  const filepath = specifier.startsWith('file://')
    ? fileURLToPath(specifier)
    : specifier;

  if (getVolume().existsSync(filepath)) {
    try {
      const format = guessFormat(filepath);
      const {href: url} = new URL(`${PROTOCOL}://${filepath}`);
      debug(
        'Resolved specifier: %s ➡️ %s (%sms)',
        specifier,
        url,
        (performance.now() - start).toFixed(2),
      );
      return {
        format,
        shortCircuit: true,
        url: url,
      };
    } catch (e) {
      debug(e);
      throw e;
    }
  }
  return nextResolve(specifier, context);
};

export const load: LoadHook = (specifier, context, nextLoad) => {
  const start = performance.now();
  if (shouldReload()) {
    reload();
  }
  if (specifier.startsWith(`${PROTOCOL}://`)) {
    const {format} = context;
    if (DISALLOWED_FORMATS.has(format)) {
      debug(
        'Warning: %s with unsupported format %s tried to load via VFS',
        specifier,
        format,
      );
      return nextLoad(specifier, context);
    }

    let source: ModuleSource;
    let pathname: string;
    try {
      // JIT URL parsing
      const url = new URL(specifier);
      ({pathname} = url);
      source = getVolume().readFileSync(pathname);
    } catch (err) {
      debug(err);
      throw err;
    }
    debug(
      'Loaded %s from VFS (%sms)',
      pathname,
      (performance.now() - start).toFixed(2),
    );
    return {
      format,
      shortCircuit: true,
      source,
    };
  }
  return nextLoad(specifier, context);
};
