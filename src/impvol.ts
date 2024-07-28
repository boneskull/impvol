/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable n/no-missing-import */
/**
 * Provides the {@link ImportableVolume} class, which synchronizes a virtual
 * filesystem with a worker thread running a custom import hook.
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import {
  fromBinarySnapshotSync,
  toBinarySnapshotSync,
} from 'memfs/lib/snapshot/binary.js';
import {Volume, type DirectoryJSON} from 'memfs/lib/volume.js';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {register} from 'node:module';
import path from 'node:path';
import {tmpdir} from 'os';
import {DEFAULT_HOOKS_PATH} from './paths-cjs.cjs';
import {IMPVOL_URL} from './paths.js';
import {type ImpVolInitData} from './types.js';

let impVol: ImportableVolume;

export class ImportableVolume extends Volume {
  public static registerHook(this: void, volume?: Volume): ImportableVolume {
    if (impVol) {
      return impVol;
    }
    registerLoaderHook();

    impVol = new ImportableVolume();

    // clone the volume if it is non-empty
    if (volume) {
      if (Object.keys(volume.toJSON()).length) {
        debug('Cloning volume');
        const snapshot = toBinarySnapshotSync({fs: volume});
        fromBinarySnapshotSync(snapshot, {fs: impVol});
        impVol.__update__();
      } else {
        debug('Refusing to clone empty volume');
      }
    }

    return impVol;
  }

  /**
   * @internal
   */
  public __update__() {
    const snapshot = toBinarySnapshotSync({fs: this});
    writeFileSync(tmp, snapshot);
    Atomics.store(uint8, 0, 1);
    debug('Updated snapshot');
  }

  public override fromJSON(json: DirectoryJSON, cwd?: string): void {
    super.fromJSON(json, cwd);
    this.__update__();
  }

  public override reset(): void {
    super.reset();
    this.__update__();
  }
}
// overrides private methods such that meaningful filesystem writes trigger an
// update on the worker thread. Note that using a `FSWatcher` was attempted, but
// memfs' implementation is probably Wrong; the change/rename events are emitted
// before the files get fully "written to".

// TODO: probably need more here, but this is a start. Also: consider doing
// something else.
Object.assign(ImportableVolume.prototype, {
  writeFileBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const retval = Volume.prototype.writeFileBase.call(
      this,
      ...args,
    ) as unknown;
    void this.__update__();
    return retval;
  },
  unlinkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const retval = Volume.prototype.unlinkBase.call(this, ...args) as unknown;
    void this.__update__();
    return retval;
  },

  writevBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const retval = Volume.prototype.writevBase.call(this, ...args) as unknown;
    void this.__update__();
    return retval;
  },

  linkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const retval = Volume.prototype.linkBase.call(this, ...args) as unknown;
    void this.__update__();
    return retval;
  },

  symlinkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const retval = Volume.prototype.symlinkBase.call(this, ...args) as unknown;
    void this.__update__();
    return retval;
  },
});

let sab: SharedArrayBuffer;
let tmp: string;
let uint8: Uint8Array;

/**
 * Registers the loader hook
 *
 * @param hooksPath Absolute path to hooks file
 * @returns A new MessagePort for communication with the hooks worker
 */
function registerLoaderHook() {
  const tmpDir = mkdtempSync(`${tmpdir()}/impvol-`);
  tmp = path.join(tmpDir, 'impvol.cbor');
  debug('Created temp file at %s', tmp);
  sab = new SharedArrayBuffer(1);
  uint8 = new Uint8Array(sab);
  Atomics.store(uint8, 0, 0);
  register<ImpVolInitData>(DEFAULT_HOOKS_PATH, {
    parentURL: IMPVOL_URL,
    data: {
      tmp,
      sab,
    },
  });
}

const debug = Debug('impvol');

export const impvol = ImportableVolume.registerHook;
