/**
 * Provides the {@link ImportableVolume} class, which synchronizes a virtual
 * filesystem with a worker thread running a custom import hook.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
// eslint-disable-next-line n/no-missing-import
import {type Link, type Node} from 'memfs/lib/node.js';
// eslint-disable-next-line n/no-missing-import
import {toJsonSnapshotSync} from 'memfs/lib/snapshot/json.js';
// eslint-disable-next-line n/no-missing-import
import {Volume, type DirectoryJSON} from 'memfs/lib/volume.js';
import {once} from 'node:events';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import {MessageChannel, type MessagePort} from 'node:worker_threads';
import {
  type ImpVolClearEvent,
  type ImpVolEvent,
  type ImpVolHookEvent,
  type ImpVolId,
  type ImpVolInitData,
  type ImpVolUpdateEvent,
} from './impvol-event.js';
import {RESOLVE_HOOKS_PATH} from './resolve-hooks.js';

type ImpVolQueueItem = {
  event: ImpVolEvent;
  resolve: () => void;
  reject: (err: unknown) => void;
};

function createId(prefix = 'impvol'): ImpVolId {
  return `${prefix}-${Math.random().toString(36).slice(7)}` as ImpVolId;
}

export class ImportableVolume extends Volume {
  readonly #impVolId = createId();

  readonly #queue: ImpVolQueueItem[] = [];

  #pending: boolean = false;

  constructor(
    private readonly port: MessagePort,
    props: {Node?: Node; Link?: Link; File?: File} = {},
  ) {
    super(props);
  }

  public static async registerHook(
    this: void,
    volume?: Volume | string,
    hooksPath: string = RESOLVE_HOOKS_PATH,
  ): Promise<ImportableVolume> {
    await Promise.resolve();
    if (typeof volume === 'string') {
      hooksPath = volume;
      volume = undefined;
    }

    const port = registerLoaderHook(hooksPath);

    const impVol = new ImportableVolume(port);
    if (volume) {
      await impVol.__update__();
    }
    return impVol;
  }

  /**
   * Updates the worker with a snapshot of the current virtual filesystem
   *
   * @todo This method should be Private private. But if it was, the prototype
   *   extension below wouldn't work. But if the prototype extension was stuffed
   *   into this class proper, then TS would complain in a way which is not so
   *   easily ignored. Maybe use a `Proxy` or something instead.
   */
  async __update__(): Promise<void> {
    const json = toJsonSnapshotSync({fs: this});
    const event: ImpVolUpdateEvent = {
      type: 'UPDATE',
      json,
      id: createId('update'),
      impVolId: this.#impVolId,
    };
    await this.#enqueue(event);
  }

  public override async fromJSON(
    json: DirectoryJSON,
    cwd?: string,
  ): Promise<void> {
    super.fromJSON(json, cwd);
    await this.__update__();
  }

  public override async reset(): Promise<void> {
    const id = createId('clear');
    const event: ImpVolClearEvent = {
      type: 'CLEAR',
      id,
      impVolId: this.#impVolId,
    };
    await this.#enqueue(event);
    super.reset();
  }

  /**
   * Async queue
   */
  async #dequeue(): Promise<void> {
    if (this.#pending) {
      return;
    }
    const item = this.#queue.shift();
    if (!item) {
      return;
    }
    const {resolve, reject, event} = item;
    try {
      this.#pending = true;
      this.port.postMessage(event);
      await this.#waitForAck(event.id);
      this.#pending = false;
      resolve();
    } catch (err) {
      this.#pending = false;
      reject(err);
    } finally {
      void this.#dequeue();
    }
  }

  #enqueue(event: ImpVolEvent): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#queue.push({event, resolve, reject});
      void this.#dequeue();
    });
  }

  async #waitFor<T extends ImpVolHookEvent>(
    type: T['type'],
    id?: ImpVolId,
  ): Promise<T> {
    const [message] = (await once(this.port, 'message')) as [ImpVolHookEvent];
    if (
      message.type === type &&
      message.impVolId === this.#impVolId &&
      (!id || message.id === id)
    ) {
      return message as T;
    }
    debug('Waiting for event "%s"; received: %O', type, message);
    return this.#waitFor(type, id);
  }

  /**
   * @param id Event ID to wait for
   * @todo Timeout?
   */
  async #waitForAck(id: ImpVolId): Promise<void> {
    await this.#waitFor('ACK', id);
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

/**
 * Registers the loader hook
 *
 * @param hooksPath Absolute path to hooks file
 * @returns A new MessagePort for communication with the hooks worker
 */
function registerLoaderHook(hooksPath: string): MessagePort {
  if (registerLoaderHook.cache.has(hooksPath)) {
    return registerLoaderHook.cache.get(hooksPath)!;
  }
  const {port1: port, port2: hookPort} = new MessageChannel();

  register<ImpVolInitData>(hooksPath, {
    parentURL,
    data: {
      port: hookPort,
    },
    transferList: [hookPort],
  });

  registerLoaderHook.cache.set(hooksPath, port);

  return port;
}
registerLoaderHook.cache = new Map<string, MessagePort>();

const debug = Debug('impvol');

export const createImportableVolume = ImportableVolume.registerHook;
const parentURL = pathToFileURL(__filename).href;
