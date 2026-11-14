// 局域网协议：主进程、preload 与渲染进程共享的纯类型/常量。
// 这里不允许 import DOM 或 Node API，避免两端编译目标互相污染。

export type NetRole = 'single' | 'host' | 'client';

export const NET_PROTOCOL_VERSION: number = 1;
export const DEFAULT_LAN_PORT: number = 2567;
export const MAX_LAN_CLIENTS: number = 4;

export interface LanWorldEntry {
    id: string;
    roomId: string;
    worldName: string;
    hostName: string;
    players: number;
    maxPlayers: number;
    address: string;
    port: number;
    version: string;
}

export interface LanPaletteState {
    type: number;
    behind: number;
    direction: number;
    condition: number;
}

export interface LanSlot {
    item: number;
    num: number;
    durability: number;
}

/** 客户端进入主机世界所需的最小快照，形状与 WorldArchive 兼容。 */
export interface LanSnapshot {
    name: string;
    version: string;
    world: number[][];
    palette: LanPaletteState[];
    lowestPoint: number;
    leftNumber: number;
    seed: number;
    skyTimer: number;
    player: {
        hp: number;
        x: number;
        y: number;
    };
    inventory: {
        items: LanSlot[];
    };
}

export interface PlayerStateMessage {
    type: 'player:state';
    hp: number;
    x: number;
    y: number;
    face: number;
    acc: number;
    legRad: number;
    handRad: number;
    needRotateHand: boolean;
    isRotateRighthand: boolean;
    rightOnMouse: boolean;
    state: number;
    selectedSlot: number;
}

export interface InventoryStateMessage {
    type: 'inventory:state';
    items: LanSlot[];
    selectedSlot: number;
}

export interface TimeMessage {
    type: 'time';
    timer: number;
}

export interface WorldDiffCell {
    x: number;
    y: number;
    index: number;
}

export interface WorldDiffMessage {
    type: 'world:diff';
    cells: WorldDiffCell[];
    palette: LanPaletteState[];
}

export interface WorldChunkMessage {
    type: 'world:chunk';
    behind: boolean;
    chunkData: number[][];
    palette: LanPaletteState[];
    chunkNum: number;
    chunkStartX: number;
    chunkLeftNumber: number;
}

export interface SnapshotMessage {
    type: 'snapshot';
    target: string;
    snapshot: LanSnapshot;
}

export interface HostStopMessage {
    type: 'host:stop';
}

export type HostToServerMessage =
    | SnapshotMessage
    | WorldDiffMessage
    | WorldChunkMessage
    | PlayerStateMessage
    | InventoryStateMessage
    | TimeMessage
    | HostStopMessage;

export interface HostStartOptions {
    worldName: string;
    gameVersion: string;
    hostName: string;
    port?: number;
}

export interface HostStartResult {
    port: number;
    roomId: string;
    addresses: string[];
}

export interface JoinOptions {
    address: string;
    port: number;
    gameVersion: string;
    playerName: string;
}

export interface JoinResult {
    snapshot: LanSnapshot;
    sessionId: string;
    roomId: string;
}

export type LanEvent =
    | { type: 'peer:join'; sessionId: string; name: string }
    | { type: 'peer:leave'; sessionId: string }
    | { type: 'player:state'; data: PlayerStateMessage }
    | { type: 'inventory:state'; data: InventoryStateMessage }
    | { type: 'world:diff'; data: WorldDiffMessage }
    | { type: 'world:chunk'; data: WorldChunkMessage }
    | { type: 'time'; timer: number }
    | { type: 'host:stop'; reason?: string }
    | { type: 'net:error'; message: string }
    | { type: 'discovered:worlds'; worlds: LanWorldEntry[] };

/** preload 通过 contextBridge 暴露给渲染进程的 API。 */
export interface CavegameLanApi {
    startHost(options: HostStartOptions): Promise<HostStartResult>;
    stopHost(): Promise<void>;
    join(options: JoinOptions): Promise<JoinResult>;
    leave(): Promise<void>;
    sendHostMessage(message: HostToServerMessage): void;
    onEvent(callback: (event: LanEvent) => void): void;
    startDiscovery(): Promise<void>;
    stopDiscovery(): Promise<void>;
    refreshDiscovery(): Promise<LanWorldEntry[]>;
    getDiscoveredWorlds(): Promise<LanWorldEntry[]>;
}
