/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable n/no-missing-import */
/**
 * Provides the {@link ImportableVolume} class, which synchronizes a virtual
 * filesystem with a worker thread running a custom import hook.
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import {type File, type Link, type Node} from 'memfs/lib/node.js';
import {
  fromBinarySnapshotSync,
  toBinarySnapshotSync,
} from 'memfs/lib/snapshot/binary.js';
import {Volume, type DirectoryJSON} from 'memfs/lib/volume.js';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {register} from 'node:module';
import path from 'node:path';
import {tmpdir} from 'os';
import {DEFAULT_HOOKS_PATH, IMPVOL_URL} from './paths.js';
import {type ImpVolInitData} from './types.js';

const TEMP_FILE = 'impvol.cbor';

let tmpDir: string;

const metadata = new WeakMap<
  ImportableVolume,
  {
    tmp: string;
    uint8: Uint8Array;
  }
>();

/**
 * @internal
 */
function update(impvol: ImportableVolume) {
  const snapshot = toBinarySnapshotSync({fs: impvol});
  const {tmp, uint8} = metadata.get(impvol)!;
  if (!tmp || !uint8) {
    throw new ReferenceError('Missing metadata');
  }
  writeFileSync(tmp, snapshot);
  Atomics.store(uint8, 0, 1);
  debug('Updated snapshot');
}

function initTempDir(tempDir?: string): string {
  let actualTempDir: string;
  if (!tempDir) {
    if (!tmpDir) {
      tmpDir = mkdtempSync(path.join(tmpdir(), 'impvol-'));
      debug('Created temp directory at %s', tmpDir);
    }
    actualTempDir = tmpDir;
  } else {
    actualTempDir = tempDir;
  }
  return actualTempDir;
}

export class ImportableVolume extends Volume {
  constructor(
    tempDir?: string,
    props?: {Node?: Node; Link?: Link; File?: File},
  ) {
    super(props);
    const sab = new SharedArrayBuffer(1);
    const uint8 = new Uint8Array(sab);
    const actualTempDir = initTempDir(tempDir);
    const tmp = path.resolve(actualTempDir, TEMP_FILE);
    metadata.set(this, {tmp, uint8});
    debug('Created temp file at %s', tmp);
    Atomics.store(uint8, 0, 0);

    register<ImpVolInitData>(DEFAULT_HOOKS_PATH, {
      parentURL: IMPVOL_URL,
      data: {
        tmp,
        sab,
      },
    });
  }

  public static create(
    this: void,
    volume?: Volume,
    tempDir?: string,
  ): ImportableVolume;
  public static create(
    this: void,
    json?: DirectoryJSON,
    tempDir?: string,
  ): ImportableVolume;

  public static create(
    this: void,
    volumeOrJson?: Volume | DirectoryJSON,
    tempDir?: string,
  ): ImportableVolume {
    const impVol = new ImportableVolume(tempDir);

    // clone the volume if it is non-empty
    if (volumeOrJson instanceof Volume) {
      if (Object.keys(volumeOrJson.toJSON()).length) {
        debug('Cloning volume');
        const snapshot = toBinarySnapshotSync({fs: volumeOrJson});
        fromBinarySnapshotSync(snapshot, {fs: impVol});
        update(impVol);
      } else {
        debug('Refusing to clone empty volume');
      }
    } else if (volumeOrJson) {
      impVol.fromJSON(volumeOrJson);
    }

    return impVol;
  }

  public override fromJSON(json: DirectoryJSON, cwd?: string): void {
    super.fromJSON(json, cwd);
    update(this);
  }

  public override reset(): void {
    super.reset();
    update(this);
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
    const returnValue = Volume.prototype.writeFileBase.call(
      this,
      ...args,
    ) as unknown;
    update(this);
    return returnValue;
  },
  unlinkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const returnValue = Volume.prototype.unlinkBase.call(
      this,
      ...args,
    ) as unknown;
    update(this);
    return returnValue;
  },

  writevBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const returnValue = Volume.prototype.writevBase.call(
      this,
      ...args,
    ) as unknown;
    update(this);
    return returnValue;
  },

  linkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const returnValue = Volume.prototype.linkBase.call(
      this,
      ...args,
    ) as unknown;
    update(this);
    return returnValue;
  },

  symlinkBase(this: ImportableVolume, ...args: unknown[]): unknown {
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const returnValue = Volume.prototype.symlinkBase.call(
      this,
      ...args,
    ) as unknown;
    update(this);
    return returnValue;
  },
});

const debug = Debug('impvol');

export const impvol = ImportableVolume.create;
