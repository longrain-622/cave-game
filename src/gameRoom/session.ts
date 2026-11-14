import type { NetRole } from '../../shared/netProtocol.js';

let role: NetRole = 'single';
let sessionId: string | null = null;

export function setNetRole(nextRole: NetRole, nextSessionId: string | null = null): void {
    role = nextRole;
    sessionId = nextSessionId;
}

export function resetNetRole(): void {
    role = 'single';
    sessionId = null;
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
