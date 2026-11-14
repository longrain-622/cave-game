import { Room, ServerError } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import type {
    InventoryStateMessage,
    PlayerInputMessage,
    PlayerJoinMessage,
    PlayerLeaveMessage,
    PlayerRespawnMessage,
    PlayerStatesMessage,
    SnapshotMessage,
    TimeMessage,
    WorldChunkMessage,
    WorldDiffMessage,
} from '../../shared/netProtocol.js';

// 主进程是 CJS，shared/netProtocol.ts 在 "type": "module" 下会编译为 ESM，
// 因此运行时常量在 CJS 侧各自声明；类型仍然复用 shared。
const MAX_LAN_CLIENTS: number = 4;

interface LanRoomCreateOptions {
    hostToken: string;
    gameVersion: string;
    hostName: string;
    worldName: string;
}

export class CaveRoom extends Room {
    private hostToken: string = '';
    private gameVersion: string = '';
    private hostName: string = '';
    private worldName: string = '';
    private hostSessionId: string = '';
    private hostClient: Client | null = null;

    onCreate(options: LanRoomCreateOptions): void {
        if (!options || typeof options.hostToken !== 'string' || options.hostToken === '') {
            throw new Error('A host token is required to create a LAN room.');
        }

        this.hostToken = options.hostToken;
        this.gameVersion = options.gameVersion;
        this.hostName = options.hostName;
        this.worldName = options.worldName;

        this.maxClients = MAX_LAN_CLIENTS;
        this.autoDispose = false;
        this.metadata = {
            worldName: this.worldName,
            hostName: this.hostName,
            gameVersion: this.gameVersion,
            protocol: 1,
        };

        this.onMessage('snapshot', (client: Client, message: SnapshotMessage): void => {
            if (!this.isHost(client)) {return;}
            if (message === null || typeof message !== 'object' || typeof message.target !== 'string') {return;}

            const target: Client | undefined = this.clients.find(
                (candidate: Client): boolean => candidate.sessionId === message.target
            );
            if (target !== undefined) {
                target.send('snapshot', message.snapshot);
            }
        });

        this.onMessage('world:diff', (client: Client, message: WorldDiffMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('world:diff', message);
        });

        this.onMessage('world:chunk', (client: Client, message: WorldChunkMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('world:chunk', message);
        });

        this.onMessage('players:state', (client: Client, message: PlayerStatesMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('players:state', message);
        });

        this.onMessage('player:join', (client: Client, message: PlayerJoinMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('player:join', message);
        });

        this.onMessage('player:leave', (client: Client, message: PlayerLeaveMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('player:leave', message);
        });

        this.onMessage('player:input', (client: Client, message: PlayerInputMessage): void => {
            if (this.isHost(client)) {return;}
            if (message === null || typeof message !== 'object' || message.type !== 'player:input') {return;}
            this.sendToHost('player:input', {
                sessionId: client.sessionId,
                input: message,
            });
        });

        this.onMessage('player:respawn', (client: Client, message: PlayerRespawnMessage): void => {
            if (this.isHost(client)) {return;}
            if (message === null || typeof message !== 'object' || message.type !== 'player:respawn') {return;}
            this.sendToHost('player:respawn', {
                sessionId: client.sessionId,
            });
        });

        this.onMessage('inventory:state', (client: Client, message: InventoryStateMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('inventory:state', message);
        });

        this.onMessage('time', (client: Client, message: TimeMessage): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('time', message.timer);
        });

        this.onMessage('host:stop', (client: Client): void => {
            if (!this.isHost(client)) {return;}
            this.broadcastToSpectators('host:stop', { reason: 'host-stopped' });
            this.clock.setTimeout((): void => { void this.disconnect(); }, 200);
        });
    }

    onAuth(_client: Client, options: any): any {
        if (options && typeof options.hostToken === 'string') {
            if (options.hostToken !== this.hostToken) {
                throw new ServerError(4001, 'Invalid host token.');
            }
            if (this.hostSessionId !== '') {
                throw new ServerError(4002, 'Host is already connected.');
            }
            if (options.version !== this.gameVersion) {
                throw new ServerError(4004, 'Game version mismatch.');
            }
            return { role: 'host' };
        }

        if (this.hostSessionId === '') {
            throw new ServerError(4003, 'Host is not ready.');
        }
        if (options?.version !== this.gameVersion) {
            throw new ServerError(4004, 'Game version mismatch.');
        }

        return { role: 'spectator' };
    }

    onJoin(client: Client, options: any, auth: any): void {
        const authData: any = auth ?? client.auth;
        if (authData && authData.role === 'host') {
            this.hostSessionId = client.sessionId;
            this.hostClient = client;
            return;
        }

        const name: string = options && typeof options.name === 'string' ? options.name : 'Player';
        this.sendToHost('peer:join', { sessionId: client.sessionId, name: name });
    }

    onLeave(client: Client): void {
        if (client.sessionId === this.hostSessionId) {
            this.broadcastToSpectators('host:stop', { reason: 'host-left' });
            this.hostSessionId = '';
            this.hostClient = null;
            void this.disconnect();
            return;
        }

        this.sendToHost('peer:leave', { sessionId: client.sessionId });
    }

    private isHost(client: Client): boolean {
        return client.sessionId === this.hostSessionId;
    }

    private sendToHost(type: string, message: unknown): void {
        if (this.hostClient === null) {return;}
        try {
            this.hostClient.send(type, message);
        } catch (error) {
            console.warn('lan room cannot send to host', error);
        }
    }

    private broadcastToSpectators(type: string, message: unknown): void {
        for (const client of this.clients) {
            if (client.sessionId === this.hostSessionId) {continue;}
            try {
                client.send(type, message);
            } catch (error) {
                console.warn('lan room cannot send to spectator', error);
            }
        }
    }
}
