import type {
    CavegameLanApi,
    ClientToServerMessage,
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
const recentEvents: LanEvent[] = [];
// 只用于衔接"事件已到达、会话监听器尚未注册"的窗口；会话开始/结束都会清空
const MAX_QUEUED_EVENTS: number = 300;

function requireApi(): CavegameLanApi {
    const api: CavegameLanApi | undefined = window.cavegameLan;
    if (api === undefined) {
        throw new Error('LAN networking is only available in the Electron app.');
    }
    return api;
}

function rememberEvent(event: LanEvent): void {
    if (recentEvents.length >= MAX_QUEUED_EVENTS) {
        recentEvents.shift();
    }
    recentEvents.push(event);
}

function dispatchEvent(event: LanEvent): void {
    rememberEvent(event);

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

    sendClientMessage(message: ClientToServerMessage): void {
        const api: CavegameLanApi | undefined = window.cavegameLan;
        if (api === undefined) {
            console.warn('apioxNet.sendClientMessage ignored: LAN API unavailable');
            return;
        }
        // 旧版 preload 没有该接口时给出明确提示，避免输入静默失效
        if (typeof api.sendClientMessage !== 'function') {
            console.error('LAN preload is outdated (sendClientMessage missing). Restart the app to reload preload.');
            return;
        }
        api.sendClientMessage(message);
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

    /** 清空待回放的事件；新会话开始前调用，避免把上一局的状态/断开事件重放进来。 */
    clearEventLog(): void {
        recentEvents.length = 0;
        queuedEvents.length = 0;
    },

    onEvent(listener: LanEventListener, replayQueued: boolean = false): () => void {
        // 先注册再回放：回放里某个事件抛异常也不会让后续事件全部收不到
        listeners.add(listener);

        if (replayQueued) {
            const replay: LanEvent[] = recentEvents.slice();
            recentEvents.length = 0;
            queuedEvents.length = 0;
            for (const event of replay) {
                try {
                    listener(event);
                } catch (error) {
                    console.error('LAN event replay failed', error);
                }
            }
        }

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
