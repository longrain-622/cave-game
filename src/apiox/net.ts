import type {
    CavegameLanApi,
    HostStartOptions,
    HostStartResult,
    HostToServerMessage,
    JoinOptions,
    JoinResult,
    LanEvent,
    LanWorldEntry,
} from '../../shared/netProtocol.js';

type LanEventListener = (event: LanEvent) => void;

const listeners: Set<LanEventListener> = new Set();
const queuedEvents: LanEvent[] = [];
const MAX_QUEUED_EVENTS: number = 1000;

function requireApi(): CavegameLanApi {
    const api: CavegameLanApi | undefined = window.cavegameLan;
    if (api === undefined) {
        throw new Error('LAN networking is only available in the Electron app.');
    }
    return api;
}

function dispatchEvent(event: LanEvent): void {
    if (listeners.size === 0) {
        if (queuedEvents.length >= MAX_QUEUED_EVENTS) {
            queuedEvents.shift();
        }
        queuedEvents.push(event);
        return;
    }

    for (const listener of listeners) {
        listener(event);
    }
}

function main(): void {
    const api: CavegameLanApi | undefined = window.cavegameLan;
    if (api === undefined) {
        console.error('cavegameLan preload is not available on window');
        return;
    }

    api.onEvent((event: LanEvent): void => {
        dispatchEvent(event);
    });
}

const apioxNet = {
    isAvailable(): boolean {
        return window.cavegameLan !== undefined;
    },

    startHost(options: HostStartOptions): Promise<HostStartResult> {
        return requireApi().startHost(options);
    },

    stopHost(): Promise<void> {
        return requireApi().stopHost();
    },

    join(options: JoinOptions): Promise<JoinResult> {
        return requireApi().join(options);
    },

    leave(): Promise<void> {
        return requireApi().leave();
    },

    sendHostMessage(message: HostToServerMessage): void {
        const api: CavegameLanApi | undefined = window.cavegameLan;
        if (api === undefined) {
            console.warn('apioxNet.sendHostMessage ignored: LAN API unavailable');
            return;
        }
        api.sendHostMessage(message);
    },

    startDiscovery(): Promise<void> {
        return requireApi().startDiscovery();
    },

    stopDiscovery(): Promise<void> {
        return requireApi().stopDiscovery();
    },

    refreshDiscovery(): Promise<LanWorldEntry[]> {
        return requireApi().refreshDiscovery();
    },

    getDiscoveredWorlds(): Promise<LanWorldEntry[]> {
        return requireApi().getDiscoveredWorlds();
    },

    onEvent(listener: LanEventListener): () => void {
        listeners.add(listener);

        if (queuedEvents.length > 0) {
            const pending: LanEvent[] = queuedEvents.splice(0);
            for (const event of pending) {
                listener(event);
            }
        }

        return (): void => {
            listeners.delete(listener);
        };
    },
};

main();

export { apioxNet };
