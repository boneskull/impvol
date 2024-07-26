import { type JsonUint8Array, type SnapshotNode } from 'memfs/lib/snapshot';
import type { MessagePort } from 'worker_threads';

declare const tag: unique symbol;

export type Tagged<K, T> = K & { [tag]: T };

export type ImpVolId = Tagged<string, 'ImpVolId'>;

export interface BaseImpVolEvent {
  type: string;
  id: ImpVolId;
  impVolId: ImpVolId;
}

export interface ImpVolUpdateEvent extends BaseImpVolEvent {
  type: 'UPDATE';
  json: JsonUint8Array<SnapshotNode>;
}

export interface ImpVolClearEvent extends BaseImpVolEvent {
  type: 'CLEAR';
}

export interface ImpVolAckEvent extends BaseImpVolEvent {
  type: 'ACK';
}

export type ImpVolHookEvent = ImpVolAckEvent;

export type ImpVolEvent = ImpVolUpdateEvent | ImpVolClearEvent;

export type ImpVolInitData = {
  port: MessagePort;
};
