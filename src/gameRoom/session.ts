import type { LanPlayerState, NetRole } from '../../shared/netProtocol.js';

let role: NetRole = 'single';
let sessionId: string | null = null;
let lanPlayers: LanPlayerState[] = [];

export function setNetRole(nextRole: NetRole, nextSessionId: string | null = null): void {
    role = nextRole;
    sessionId = nextSessionId;
    if (nextRole !== 'client') {lanPlayers = [];}
}

export function resetNetRole(): void {
    role = 'single';
    sessionId = null;
    lanPlayers = [];
}

export function setLanPlayers(players: LanPlayerState[]): void {
    lanPlayers = players;
}

export function getLanPlayers(): LanPlayerState[] {
    return lanPlayers;
}

export function getNetRole(): NetRole {
    return role;
}

export function getSessionId(): string | null {
    return sessionId;
}

export function isClient(): boolean {
    return role === 'client';
}

export function isHost(): boolean {
    return role === 'host';
}

export function isSingle(): boolean {
    return role === 'single';
}

/** 客户端是访客，退出时不能把主机世界写进本地存档。 */
export function isGuest(): boolean {
    return role === 'client';
}
