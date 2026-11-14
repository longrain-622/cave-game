import { contextBridge, ipcRenderer } from 'electron';
import type {
    CavegameLanApi,
    ClientToServerMessage,
    HostStartOptions,
    HostToServerMessage,
    JoinOptions,
    LanEvent,
} from '../shared/netProtocol.js';

function main(): void {
    const api: CavegameLanApi = {
        startHost: (options: HostStartOptions) => ipcRenderer.invoke('lan:startHost', options),
        stopHost: () => ipcRenderer.invoke('lan:stopHost'),
        join: (options: JoinOptions) => ipcRenderer.invoke('lan:join', options),
        leave: () => ipcRenderer.invoke('lan:leave'),
        sendHostMessage: (message: HostToServerMessage): void => {
            ipcRenderer.send('lan:hostMessage', message);
        },
        sendClientMessage: (message: ClientToServerMessage): void => {
            ipcRenderer.send('lan:clientMessage', message);
        },
        onEvent: (callback: (event: LanEvent) => void): void => {
            ipcRenderer.on('lan:event', (_event, payload: LanEvent): void => {
                callback(payload);
            });
        },
        startDiscovery: () => ipcRenderer.invoke('lan:startDiscovery'),
        stopDiscovery: () => ipcRenderer.invoke('lan:stopDiscovery'),
        refreshDiscovery: () => ipcRenderer.invoke('lan:refreshDiscovery'),
        getDiscoveredWorlds: () => ipcRenderer.invoke('lan:getDiscoveredWorlds'),
    };

    contextBridge.exposeInMainWorld('cavegameLan', api);
    console.log('cavegameLan preload ready');
}

main();
