import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client } from '@colyseus/sdk';
import type { Room as ClientRoom } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { createServer as createNetServer } from 'node:net';
import { CaveRoom } from './room.cjs';
import {
    getDiscoveredWorlds,
    refreshDiscovery,
    startDiscovery,
    startHostBroadcast,
    stopDiscovery,
    stopHostBroadcast,
    updateHostBroadcastPlayers,
} from './discovery.cjs';
import type {
    ClientToServerMessage,
    HostStartOptions,
    HostStartResult,
    HostToServerMessage,
    JoinOptions,
    JoinResult,
    LanEvent,
    LanSnapshot,
    LanWorldEntry,
} from '../../shared/netProtocol.js';

const DEFAULT_LAN_PORT: number = 2567;
const PORT_ATTEMPTS: number = 12;

let hostServer: Server | null = null;
let hostRoom: ClientRoom | null = null;
let clientRoom: ClientRoom | null = null;
let stoppingHost: boolean = false;
let leavingRoom: boolean = false;
let spectatorCount: number = 0;
let eventSender: ((event: LanEvent) => void) | null = null;

export function setLanEventSender(sender: ((event: LanEvent) => void) | null): void {
    eventSender = sender;
}

function emitEvent(event: LanEvent): void {
    if (eventSender !== null) {
        eventSender(event);
    }
}

function isPrivateLanAddress(address: string): boolean {
    const parts: number[] = address.split('.').map(Number);
    if (parts.length !== 4) {return false;}
    return parts[0] === 10
        || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

function getLocalAddresses(): string[] {
    const addresses: string[] = [];
    const interfaces = networkInterfaces();

    for (const entries of Object.values(interfaces)) {
        if (!entries) {continue;}
        for (const entry of entries) {
            if (entry.family === 'IPv4' && !entry.internal) {
                addresses.push(entry.address);
            }
        }
    }

    // 优先展示普通局域网地址，避免把 Tailscale/VPN 地址排在第一位。
    addresses.sort((a: string, b: string): number => (
        Number(isPrivateLanAddress(b)) - Number(isPrivateLanAddress(a))
    ));

    return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

function isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void): void => {
        const probe = createNetServer();
        probe.once('error', (): void => { resolve(false); });
        probe.once('listening', (): void => {
            probe.close((): void => { resolve(true); });
        });
        probe.listen(port, '0.0.0.0');
    });
}

async function findAvailablePort(preferred: number): Promise<number> {
    for (let offset = 0; offset < PORT_ATTEMPTS; offset++) {
        const port: number = preferred + offset;
        if (await isPortFree(port)) {
            return port;
        }
    }
    throw new Error('No free LAN port available.');
}

async function shutdownServer(server: Server): Promise<void> {
    try {
        await server.gracefullyShutdown(false);
    } catch (error) {
        console.warn('lan server shutdown failed', error);
    }
}

export async function startHost(options: HostStartOptions): Promise<HostStartResult> {
    if (hostServer !== null || hostRoom !== null) {
        throw new Error('Already hosting a LAN room.');
    }

    const port: number = await findAvailablePort(options.port ?? DEFAULT_LAN_PORT);
    const hostToken: string = randomUUID();
    const server = new Server({
        // 世界快照是一条大消息；ws-transport 默认 maxPayload 只有 4KB。
        transport: new WebSocketTransport({ maxPayload: 64 * 1024 * 1024 }),
        greet: false,
    });

    server.define('cavegame', CaveRoom);

    try {
        await server.listen(port, '0.0.0.0');
        const client = new Client('ws://127.0.0.1:' + port);
        const room: ClientRoom = await client.create('cavegame', {
            hostToken: hostToken,
            gameVersion: options.gameVersion,
            hostName: options.hostName,
            worldName: options.worldName,
            name: options.hostName,
            version: options.gameVersion,
        });

        room.onMessage('peer:join', (message: any): void => {
            spectatorCount += 1;
            updateHostBroadcastPlayers(1 + spectatorCount);
            emitEvent({
                type: 'peer:join',
                sessionId: String(message?.sessionId ?? ''),
                name: String(message?.name ?? 'Player'),
            });
        });
        room.onMessage('peer:leave', (message: any): void => {
            spectatorCount = Math.max(0, spectatorCount - 1);
            updateHostBroadcastPlayers(1 + spectatorCount);
            emitEvent({
                type: 'peer:leave',
                sessionId: String(message?.sessionId ?? ''),
            });
        });
        room.onMessage('player:input', (message: any): void => {
            const sessionId: string = String(message?.sessionId ?? '');
            const input: any = message?.input;
            if (sessionId === '' || input === null || typeof input !== 'object') {return;}

            const tick: number = Number(input.tick);
            if (!Number.isFinite(tick) || tick <= 0) {return;}   // 非法 tick 直接丢弃


            emitEvent({
                type: 'player:input',
                sessionId: sessionId,
                input: {
                    left: Number(input.left) || 0,
                    right: Number(input.right) || 0,
                    jumpHeld: Boolean(input.jumpHeld),
                    jumpPressed: Boolean(input.jumpPressed),
                    acc: Number(input.acc) || 0,
                    face: Number(input.face) || -1,
                    uiBlocked: Boolean(input.uiBlocked),
                    tick: tick,
                },
            });
        });
        room.onMessage('player:respawn', (message: any): void => {
            const sessionId: string = String(message?.sessionId ?? '');
            if (sessionId === '') {return;}
            emitEvent({ type: 'player:respawn', sessionId: sessionId });
        });
        room.onError((code: number, message?: string): void => {
            emitEvent({ type: 'net:error', message: 'Host room error ' + code + ': ' + (message ?? '') });
        });
        room.onLeave((code: number, reason?: string): void => {
            stopHostBroadcast();
            if (stoppingHost) {return;}
            emitEvent({
                type: 'net:error',
                message: 'Host connection lost (' + code + (reason ? ': ' + reason : '') + ')',
            });
        });

        hostServer = server;
        hostRoom = room;
        spectatorCount = 0;
        startHostBroadcast({
            roomId: room.roomId,
            port: port,
            worldName: options.worldName,
            hostName: options.hostName,
            version: options.gameVersion,
            players: 1,
            maxPlayers: 4,
        });

        return {
            port: port,
            roomId: room.roomId,
            addresses: getLocalAddresses(),
        };
    } catch (error) {
        stopHostBroadcast();
        await shutdownServer(server);
        throw error;
    }
}

export async function stopHost(): Promise<void> {
    if (stoppingHost) {return;}
    stoppingHost = true;
    stopHostBroadcast();
    spectatorCount = 0;

    const room: ClientRoom | null = hostRoom;
    hostRoom = null;

    if (room !== null) {
        try {
            room.send('host:stop', {});
        } catch (error) {
            console.warn('lan host cannot notify spectators', error);
        }
        try {
            await room.leave();
        } catch (error) {
            console.warn('lan host cannot leave room', error);
        }
    }

    const server: Server | null = hostServer;
    hostServer = null;
    if (server !== null) {
        await shutdownServer(server);
    }

    stoppingHost = false;
}

export function sendHostMessage(message: HostToServerMessage): void {
    if (hostRoom === null) {
        console.warn('lan host message ignored: not hosting');
        return;
    }

    try {
        hostRoom.send(message.type, message);
    } catch (error) {
        console.warn('lan host cannot send message', error);
    }
}

export function sendClientMessage(message: ClientToServerMessage): void {
    if (clientRoom === null) {
        console.warn('lan client message ignored: not connected');
        return;
    }

    try {
        clientRoom.send(message.type, message);
    } catch (error) {
        console.warn('lan client cannot send message', error);
    }
}

export async function joinRoom(options: JoinOptions): Promise<JoinResult> {
    if (clientRoom !== null) {
        throw new Error('Already connected to a LAN room.');
    }

    const client = new Client('ws://' + options.address + ':' + options.port);
    const joinPayload = {
        version: options.gameVersion,
        name: options.playerName,
    };
    // 只有主机可以创建房间；客户端必须加入已有房间，否则会触发 onCreate 的 hostToken 校验。
    const room: ClientRoom = options.roomId
        ? await client.joinById(options.roomId, joinPayload)
        : await client.join('cavegame', joinPayload);
    clientRoom = room;

    // 先挂玩家生命周期，避免等待 snapshot 期间错过其他玩家的加入/离开。
    room.onMessage('player:join', (message: any): void => {
        const player = message?.player;
        if (player === null || typeof player !== 'object') {return;}
        emitEvent({ type: 'player:join', player: player });
    });
    room.onMessage('player:leave', (message: any): void => {
        const playerId: string = String(message?.playerId ?? '');
        if (playerId === '') {return;}
        emitEvent({ type: 'player:leave', playerId: playerId });
    });

    try {
        const snapshot = await new Promise<LanSnapshot>((resolve, reject): void => {
            const timer = setTimeout((): void => {
                reject(new Error('Timed out waiting for the host snapshot.'));
            }, 10000);

            const off = room.onMessage('snapshot', (payload: LanSnapshot): void => {
                clearTimeout(timer);
                off();
                resolve(payload);
            });
            room.onError((code: number, message?: string): void => {
                clearTimeout(timer);
                reject(new Error('Room error ' + code + ': ' + (message ?? '')));
            });
            room.onLeave((code: number, reason?: string): void => {
                clearTimeout(timer);
                reject(new Error('Disconnected from host (' + code + (reason ? ': ' + reason : '') + ')'));
            });
        });

        room.onMessage('players:state', (message: any): void => {
            const players = message?.players;
            if (!Array.isArray(players)) {return;}
            emitEvent({ type: 'players:state', players: players });
        });
        room.onMessage('inventory:state', (message: any): void => {
            emitEvent({ type: 'inventory:state', data: message });
        });
        room.onMessage('world:diff', (message: any): void => {
            emitEvent({ type: 'world:diff', data: message });
        });
        room.onMessage('world:chunk', (message: any): void => {
            emitEvent({ type: 'world:chunk', data: message });
        });
        room.onMessage('time', (timer: number): void => {
            emitEvent({ type: 'time', timer: timer });
        });
        room.onMessage('host:stop', (payload: any): void => {
            emitEvent({ type: 'host:stop', reason: String(payload?.reason ?? 'host-stopped') });
        });
        room.onError((code: number, message?: string): void => {
            emitEvent({ type: 'net:error', message: 'Room error ' + code + ': ' + (message ?? '') });
        });
        room.onLeave((code: number, reason?: string): void => {
            if (leavingRoom) {return;}
            clientRoom = null;
            emitEvent({
                type: 'host:stop',
                reason: 'Disconnected (' + code + (reason ? ': ' + reason : '') + ')',
            });
        });

        return {
            snapshot: snapshot,
            sessionId: room.sessionId,
            roomId: room.roomId,
        };
    } catch (error) {
        clientRoom = null;
        try {
            await room.leave();
        } catch (leaveError) {
            console.warn('lan client cannot leave failed room', leaveError);
        }
        throw error;
    }
}

export async function leaveRoom(): Promise<void> {
    const room: ClientRoom | null = clientRoom;
    clientRoom = null;
    if (room === null) {return;}

    leavingRoom = true;
    try {
        await room.leave();
    } catch (error) {
        console.warn('lan client cannot leave room', error);
    } finally {
        leavingRoom = false;
    }
}

export function startLanDiscovery(): void {
    startDiscovery((worlds: LanWorldEntry[]): void => {
        emitEvent({ type: 'discovered:worlds', worlds: worlds });
    });
}

export function stopLanDiscovery(): void {
    stopDiscovery();
}

export function refreshLanDiscovery(): LanWorldEntry[] {
    return refreshDiscovery();
}

export function getLanDiscoveredWorlds(): LanWorldEntry[] {
    return getDiscoveredWorlds();
}

export async function shutdownLan(): Promise<void> {
    stopLanDiscovery();
    await stopHost();
    await leaveRoom();
}
