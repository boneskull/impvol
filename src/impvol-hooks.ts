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
import {type ImpVolInitData} from './types.js';

const debug = Debug('impvol:hooks');

const PROTOCOL = 'impvol';

let vol: Volume | undefined;

/**
 * Gets or sets & gets the {@link vol} singleton
 *
 * @returns The {@link vol} singleton
 */
function getVolume(): Volume {
  return vol ?? (vol = new Volume());
}

let tmp: string;
let buf: Uint8Array;

export const initialize: InitializeHook<ImpVolInitData> = ({
  tmp: _tmp,
  sab,
}) => {
  tmp = _tmp;
  buf = new Uint8Array(sab);
};

/**
 * @todo Test WASM
 */
const DISALLOWED_FORMATS = new Set(['builtin']);

function guessFormat(specifier: string): ModuleFormat | undefined {
  const ext = path.extname(specifier);
  switch (ext) {
    case '.mjs':
      return 'module';
    case '.cjs':
      return 'commonjs';
    case '.json':
      return 'json';
    case '.wasm':
      return 'wasm';
    default:
      return undefined;
  }
}

function shouldReload(): boolean {
  return Atomics.load(buf, 0) !== 0;
}

function reload() {
  const buffer = readFileSync(tmp);
  const cbor = new Uint8Array(buffer);
  const vol = getVolume();
  vol.reset();
  // XXX: memfs needs to re-export type CborUint8Array
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  fromBinarySnapshotSync(cbor as any, {fs: vol});
}

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  const start = performance.now();
  if (shouldReload()) {
    reload();
  }
  if (getVolume().existsSync(specifier)) {
    try {
      const format = guessFormat(specifier);
      const {href: url} = new URL(`${PROTOCOL}://${specifier}`);
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
      ({pathname} = new URL(specifier));
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
