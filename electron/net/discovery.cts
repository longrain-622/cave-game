import { createSocket, type RemoteInfo, type Socket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import type { LanWorldEntry } from '../../shared/netProtocol.js';

const DISCOVERY_PORT: number = 4445;
const DISCOVERY_MAGIC: string = 'CAVEGAME_LAN';
const DISCOVERY_PROTOCOL: number = 1;
const BROADCAST_INTERVAL_MS: number = 2000;
const ENTRY_TTL_MS: number = 5000;
const CLEANUP_INTERVAL_MS: number = 2000;

interface DiscoveryPacket {
    magic: string;
    protocol: number;
    roomId: string;
    port: number;
    worldName: string;
    hostName: string;
    players: number;
    maxPlayers: number;
    version: string;
    addresses?: string[];
}

interface LocalIpv4 {
    address: string;
    netmask: string;
}

interface HostBroadcastInfo {
    roomId: string;
    port: number;
    worldName: string;
    hostName: string;
    version: string;
    players: number;
    maxPlayers: number;
}

interface DiscoveredEntry {
    entry: LanWorldEntry;
    lastSeen: number;
}

let hostSocket: Socket | null = null;
let hostInfo: HostBroadcastInfo | null = null;
let hostTimer: NodeJS.Timeout | null = null;

let listenerSocket: Socket | null = null;
let listenerCallback: ((worlds: LanWorldEntry[]) => void) | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;
const discovered: Map<string, DiscoveredEntry> = new Map();

function getLocalIpv4(): LocalIpv4[] {
    const result: LocalIpv4[] = [];
    const interfaces = networkInterfaces();

    for (const entries of Object.values(interfaces)) {
        if (!entries) {continue;}
        for (const entry of entries) {
            if (entry.family !== 'IPv4' || entry.internal) {continue;}
            result.push({ address: entry.address, netmask: entry.netmask });
        }
    }

    return result;
}

function getBroadcastAddresses(): string[] {
    const addresses: Set<string> = new Set(['255.255.255.255']);

    for (const local of getLocalIpv4()) {
        const ipParts: number[] = local.address.split('.').map(Number);
        const maskParts: number[] = local.netmask.split('.').map(Number);
        if (ipParts.length !== 4 || maskParts.length !== 4) {continue;}

        const broadcast: string = ipParts
            .map((part: number, index: number): string => String(part | (~maskParts[index] & 0xff)))
            .join('.');
        addresses.add(broadcast);
    }

    return Array.from(addresses);
}

function ipToInt(ip: string): number | null {
    const parts: number[] = ip.split('.').map(Number);
    if (parts.length !== 4) {return null;}
    if (parts.some((part: number): boolean => !Number.isInteger(part) || part < 0 || part > 255)) {return null;}
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function sameSubnet(hostIp: string, localIp: string, netmask: string): boolean {
    const host: number | null = ipToInt(hostIp);
    const local: number | null = ipToInt(localIp);
    const mask: number | null = ipToInt(netmask);
    if (host === null || local === null || mask === null) {return false;}
    return (host & mask) === (local & mask);
}

function isPrivateLan(ip: string): boolean {
    const parts: number[] = ip.split('.').map(Number);
    if (parts.length !== 4) {return false;}
    return parts[0] === 10
        || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

function chooseHostAddress(packet: DiscoveryPacket, remote: RemoteInfo): string {
    const candidates: string[] = ((packet.addresses && packet.addresses.length > 0)
        ? packet.addresses
        : [remote.address])
        .slice()
        .sort((a: string, b: string): number => (
            Number(isPrivateLan(b)) - Number(isPrivateLan(a))
        ));
    const locals: LocalIpv4[] = getLocalIpv4();

    for (const hostAddress of candidates) {
        for (const local of locals) {
            if (sameSubnet(hostAddress, local.address, local.netmask)) {
                return hostAddress;
            }
        }
    }

    const privateAddress: string | undefined = candidates.find(isPrivateLan);
    return privateAddress ?? remote.address;
}

function sendHostBroadcast(): void {
    if (hostSocket === null || hostInfo === null) {return;}

    const packet: DiscoveryPacket = {
        magic: DISCOVERY_MAGIC,
        protocol: DISCOVERY_PROTOCOL,
        roomId: hostInfo.roomId,
        port: hostInfo.port,
        worldName: hostInfo.worldName,
        hostName: hostInfo.hostName,
        players: hostInfo.players,
        maxPlayers: hostInfo.maxPlayers,
        version: hostInfo.version,
        addresses: getLocalIpv4().map((local: LocalIpv4): string => local.address),
    };
    const payload: Buffer = Buffer.from(JSON.stringify(packet), 'utf8');

    for (const address of getBroadcastAddresses()) {
        hostSocket.send(payload, 0, payload.length, DISCOVERY_PORT, address, (error?: Error | null): void => {
            if (error) {
                console.warn('LAN discovery broadcast failed', address, error.message);
            }
        });
    }
}

export function startHostBroadcast(info: HostBroadcastInfo): void {
    stopHostBroadcast();

    hostInfo = { ...info };
    hostSocket = createSocket('udp4');
    hostSocket.on('error', (error: Error): void => {
        console.warn('LAN discovery host socket error', error.message);
    });
    hostSocket.bind(0, (): void => {
        if (hostSocket === null) {return;}
        try {
            hostSocket.setBroadcast(true);
        } catch (error) {
            console.warn('LAN discovery setBroadcast failed', error);
        }
        sendHostBroadcast();
    });

    hostTimer = setInterval(sendHostBroadcast, BROADCAST_INTERVAL_MS);
}

export function updateHostBroadcastPlayers(players: number): void {
    if (hostInfo !== null) {
        hostInfo.players = players;
    }
}

export function stopHostBroadcast(): void {
    if (hostTimer !== null) {
        clearInterval(hostTimer);
        hostTimer = null;
    }
    if (hostSocket !== null) {
        try {
            hostSocket.close();
        } catch (error) {
            console.warn('LAN discovery host socket close failed', error);
        }
        hostSocket = null;
    }
    hostInfo = null;
}

function emitDiscovered(): void {
    if (listenerCallback === null) {return;}

    const worlds: LanWorldEntry[] = Array.from(discovered.values())
        .map((item: DiscoveredEntry): LanWorldEntry => item.entry)
        .sort((a: LanWorldEntry, b: LanWorldEntry): number => a.worldName.localeCompare(b.worldName));
    listenerCallback(worlds);
}

function cleanupDiscovered(): void {
    const now: number = Date.now();
    let changed: boolean = false;

    for (const [key, item] of discovered) {
        if (now - item.lastSeen > ENTRY_TTL_MS) {
            discovered.delete(key);
            changed = true;
        }
    }
    if (changed) {emitDiscovered();}
}

function handlePacket(message: Buffer, remote: RemoteInfo): void {
    let packet: DiscoveryPacket;
    try {
        packet = JSON.parse(message.toString('utf8')) as DiscoveryPacket;
    } catch {
        return;
    }

    if (!packet || packet.magic !== DISCOVERY_MAGIC || packet.protocol !== DISCOVERY_PROTOCOL) {return;}
    if (typeof packet.roomId !== 'string' || packet.roomId === '') {return;}
    if (typeof packet.port !== 'number' || !Number.isInteger(packet.port)) {return;}

    const entry: LanWorldEntry = {
        id: packet.roomId,
        roomId: packet.roomId,
        worldName: String(packet.worldName ?? 'LAN World'),
        hostName: String(packet.hostName ?? 'Host'),
        players: Number.isInteger(packet.players) ? packet.players : 1,
        maxPlayers: Number.isInteger(packet.maxPlayers) ? packet.maxPlayers : 4,
        address: chooseHostAddress(packet, remote),
        port: packet.port,
        version: String(packet.version ?? ''),
    };

    discovered.set(packet.roomId, { entry: entry, lastSeen: Date.now() });
    emitDiscovered();
}

export function startDiscovery(callback: (worlds: LanWorldEntry[]) => void): void {
    listenerCallback = callback;

    if (listenerSocket !== null) {
        emitDiscovered();
        return;
    }

    const socket: Socket = createSocket({ type: 'udp4', reuseAddr: true });
    listenerSocket = socket;
    socket.on('message', handlePacket);
    socket.on('error', (error: Error): void => {
        console.warn('LAN discovery listener error', error.message);
    });
    socket.bind(DISCOVERY_PORT, '0.0.0.0', (): void => {
        console.log('LAN discovery listening on', DISCOVERY_PORT);
    });

    cleanupTimer = setInterval(cleanupDiscovered, CLEANUP_INTERVAL_MS);
    emitDiscovered();
}

export function stopDiscovery(): void {
    listenerCallback = null;

    if (cleanupTimer !== null) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
    if (listenerSocket !== null) {
        try {
            listenerSocket.close();
        } catch (error) {
            console.warn('LAN discovery listener close failed', error);
        }
        listenerSocket = null;
    }

    discovered.clear();
}

export function refreshDiscovery(): LanWorldEntry[] {
    discovered.clear();
    emitDiscovered();
    return [];
}

export function getDiscoveredWorlds(): LanWorldEntry[] {
    return Array.from(discovered.values()).map((item: DiscoveredEntry): LanWorldEntry => item.entry);
}
