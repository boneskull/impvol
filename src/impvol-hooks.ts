/**
 * Implements custom hooks for importing from virtual file systems
 *
 * @packageDocumentation
 * @todo Probably nix the entire idea of multiple volumes and just use a
 *   singleton. I cannot see how to reconcile multiple volumes within Node.js'
 *   module system short of using import attributes or search params or
 *   something.
 */

import Debug from 'debug';
// eslint-disable-next-line n/no-missing-import
import { fromJsonSnapshotSync } from 'memfs/lib/snapshot/json.js';
// eslint-disable-next-line n/no-missing-import
import { Volume } from 'memfs/lib/volume.js';
import {
  type InitializeHook,
  type LoadHook,
  type ResolveHook,
} from 'node:module';
import path from 'node:path';
import { inspect } from 'node:util';
import { type MessagePort } from 'node:worker_threads';
import {
  type ImpVolAckEvent,
  type ImpVolEvent,
  type ImpVolInitData,
} from './impvol-event.js';

const debug = Debug('impvol:hooks');

const PROTOCOL = 'impvol';

let vol: Volume | undefined;

const knownPaths: Set<string> = new Set();

function getVolume(): Volume {
  return vol ?? (vol = new Volume());
}

function updateVolumeMap() {
  for (const filepath of Object.keys(getVolume().toJSON())) {
    knownPaths.add(filepath);
    knownPaths.add(path.dirname(filepath));
  }
}

function ack(port: MessagePort, event: ImpVolEvent): void {
  const ackEvent: ImpVolAckEvent = {
    type: 'ACK',
    id: event.id,
    impVolId: event.impVolId,
  };
  port.postMessage(ackEvent);
}

export const initialize: InitializeHook<ImpVolInitData> = ({ port }) => {
  port.on('message', (event: ImpVolEvent) => {
    const start = performance.now();
    const vol = getVolume();
    switch (event.type) {
      case 'UPDATE': {
        fromJsonSnapshotSync(event.json, { fs: vol });
        updateVolumeMap();
        break;
      }
      case 'CLEAR': {
        knownPaths.clear();
        vol.reset();
        break;
      }
      default: {
        throw new TypeError(`Unknown message: ${inspect(event)}`);
      }
    }

    ack(port, event);

    debug(
      'Event %s handled in %sms',
      event.type,
      (performance.now() - start).toFixed(2),
    );
  });
};

const DISALLOWED_FORMATS = new Set(['wasm', 'builtin']);

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  const start = performance.now();
  if (knownPaths.has(specifier)) {
    try {
      const ext = path.extname(specifier);
      const format =
        ext === '.mjs' ? 'module' : ext === '.json' ? 'json' : 'commonjs';
      const url = new URL(`${PROTOCOL}://${specifier}`).href;
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
  let url: URL;
  try {
    url = new URL(specifier);
  } catch (err) {
    debug('Error parsing "%s" as URL: %s', specifier, err);
    return nextLoad(specifier, context);
  }
  if (url.protocol.startsWith(PROTOCOL)) {
    const { format } = context;
    if (DISALLOWED_FORMATS.has(format)) {
      debug(
        'Warning: %s with unsupported format %s tried to load via VFS',
        specifier,
        format,
      );
      return nextLoad(specifier, context);
    }
    const filepath = url.pathname;
    return getVolume()
      .promises.readFile(filepath)
      .then((source) => {
        debug(
          'Loaded %s from VFS (%sms)',
          filepath,
          (performance.now() - start).toFixed(2),
        );
        return {
          format,
          shortCircuit: true,
          source,
        };
      });
  }
  return nextLoad(specifier, context);
};
