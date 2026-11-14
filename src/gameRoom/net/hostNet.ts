import { apioxNet } from '../../apiox/net.js';
import { apioxTime } from '../../apiox/time.js';
import { buildWorldArchive } from '../../user/saveWorld.js';
import { player, createPlayer, remotePlayers, remoteInputs, createEmptyPlayerInput } from '../player.js';
import type { Players } from '../player.js';
import { inventory, widgets } from '../gui/gameGUI/inventory.js';
import { clock } from '../nature/sky.js';
import { chunk, palette, setWorldStateListener, world, place_meeting } from '../world.js';
import type { BlockPos } from '../world.js';
import { eventBus } from '../others/eventBus.js';
import { setNetRole } from '../session.js';
import { HOST_PLAYER_ID } from '../../../shared/netProtocol.js';
import type {
    HostToServerMessage,
    InventoryStateMessage,
    LanEvent,
    LanPlayerState,
    LanSnapshot,
    PlayerStatesMessage,
    TimeMessage,
    WorldChunkMessage,
    WorldDiffCell,
    WorldDiffMessage,
} from '../../../shared/netProtocol.js';

type PeerCountListener = (count: number) => void;

let active: boolean = false;
let peerCount: number = 0;
let offEvents: (() => void) | null = null;
let offChunks: (() => void) | null = null;
let playerTimer: number | null = null;
let inventoryTimer: number | null = null;
let timeTimer: number | null = null;
let diffTimer: number | null = null;
let peerCountListener: PeerCountListener | null = null;
const pendingDiffs: Map<string, WorldDiffCell> = new Map();
const unknownInputSessions: Set<string> = new Set();
// 上一次随 diff/chunk 下发的调色板长度；调色板只增不减，长度不变时客户端无需重载
let sentPaletteLength: number = -1;

const PLAYER_INTERVAL_MS: number = 33;
const INVENTORY_INTERVAL_MS: number = 500;
const TIME_INTERVAL_MS: number = 1000;

function notifyPeerCount(): void {
    if (peerCountListener !== null) {
        peerCountListener(peerCount);
    }
}

function hasPeers(): boolean {
    return remotePlayers.size > 0;
}

function send(message: HostToServerMessage): void {
    apioxNet.sendHostMessage(message);
}

function makePlayerState(p: Players, playerId: string, selectedSlot: number): LanPlayerState {
    return {
        playerId: playerId,
        hp: p.hp,
        x: p.x,
        y: p.y,
        face: p.face,
        acc: p.acc,
        legRad: p.leg_rad,
        handRad: p.hand_rad,
        needRotateHand: p.needRotateHand,
        isRotateRighthand: p.isRotateRighthand,
        rightOnMouse: p.rightOnMouse,
        state: p.state,
        selectedSlot: selectedSlot,
    };
}

function buildPlayerList(): LanPlayerState[] {
    const players: LanPlayerState[] = [makePlayerState(player, HOST_PLAYER_ID, widgets.select)];
    for (const remote of remotePlayers.values()) {
        players.push(makePlayerState(remote, remote.id, 0));
    }
    return players;
}

function buildSnapshot(self: Players): LanSnapshot {
    const archive = buildWorldArchive(true);

    return {
        name: archive.name,
        version: archive.version,
        world: archive.world,
        palette: archive.palette ?? [],
        lowestPoint: archive.lowest_point,
        leftNumber: archive.left_number,
        seed: archive.seed,
        skyTimer: archive.skyTimer,
        player: {
            hp: self.hp,
            x: self.x,
            y: self.y,
        },
        players: buildPlayerList(),
        inventory: archive.inventory,
    };
}

function sendPlayerStates(): void {
    if (!hasPeers()) {return;}

    const players: LanPlayerState[] = [makePlayerState(player, HOST_PLAYER_ID, widgets.select)];
    for (const remote of remotePlayers.values()) {
        players.push(makePlayerState(remote, remote.id, 0));
    }

    // 一帧只发一条消息：消息数不随玩家数量增长，客户端也能在同一帧内拿到完整快照
    const message: PlayerStatesMessage = {
        type: 'players:state',
        players: players,
    };
    send(message);
}

function sendInventoryState(): void {
    const message: InventoryStateMessage = {
        type: 'inventory:state',
        items: inventory.items.map((slot) => ({
            item: slot.item,
            num: slot.num,
            durability: slot.durability,
        })),
        selectedSlot: widgets.select,
    };

    send(message);
}

function sendTime(): void {
    const message: TimeMessage = {
        type: 'time',
        timer: clock.timer,
    };

    send(message);
}

function shouldSendPalette(): boolean {
    if (palette.length === sentPaletteLength) {return false;}
    sentPaletteLength = palette.length;
    return true;
}

function flushDiffs(): void {
    if (pendingDiffs.size === 0) {return;}

    const cells: WorldDiffCell[] = Array.from(pendingDiffs.values());
    pendingDiffs.clear();
    if (!hasPeers()) {return;}

    const message: WorldDiffMessage = {
        type: 'world:diff',
        cells: cells,
    };
    if (shouldSendPalette()) {
        message.palette = palette.slice();
    }
    send(message);
}

function sendChunk(behind: boolean): void {
    if (!hasPeers()) {return;}

    const width: number = chunk.width;
    const message: WorldChunkMessage = {
        type: 'world:chunk',
        behind: behind,
        chunkData: world.map((row: number[]): number[] => (
            behind ? row.slice(row.length - width) : row.slice(0, width)
        )),
        chunkNum: chunk.num,
        chunkStartX: chunk.start_x,
        chunkLeftNumber: chunk.left_number,
    };
    if (shouldSendPalette()) {
        message.palette = palette.slice();
    }

    send(message);
}

function placeNearHost(target: Players): void {
    const worldWidth: number = world[0].length * 64;
    target.x = player.x + 128 * (remotePlayers.size + 1);
    if (target.x < 0 || target.x > worldWidth - target.width) {
        target.x = player.x;
    }

    target.y = player.y;
    let attempts: number = 0;
    while (attempts < 8 && (
        place_meeting(target.x + 8, target.y + 128)
        || place_meeting(target.x + 56, target.y + 128)
        || place_meeting(target.x + 32, target.y)
        || place_meeting(target.x + 32, target.y + 64)
    )) {
        target.y -= 64;
        attempts++;
    }

    if (attempts >= 8) {
        target.x = player.x;
        target.y = player.y;
    }

    target.vsp = 0;
    target.hsp = 0;
    target.can_jump = false;
}

function spawnRemotePlayer(sessionId: string): Players {
    const remote: Players = createPlayer(sessionId);
    placeNearHost(remote);
    return remote;
}

function sendSnapshotTo(sessionId: string): void {
    const remote: Players | undefined = remotePlayers.get(sessionId);
    if (remote === undefined) {return;}

    send({
        type: 'snapshot',
        target: sessionId,
        snapshot: buildSnapshot(remote),
    });
    sendInventoryState();
    sendTime();
}

function handlePlayerInput(sessionId: string, input: {
    left: number;
    right: number;
    jumpHeld: boolean;
    jumpPressed: boolean;
    acc: number;
    face: number;
    uiBlocked: boolean;
}): void {
    if (!remotePlayers.has(sessionId)) {
        // 输入早于 peer:join 到达或来自已离开的会话；每个会话只提示一次，便于排查
        if (!unknownInputSessions.has(sessionId)) {
            unknownInputSessions.add(sessionId);
            console.warn('[lan] dropped player input from unknown session', sessionId);
        }
        return;
    }

    const previous = remoteInputs.get(sessionId);
    remoteInputs.set(sessionId, {
        left: input.left > 0 ? 1 : 0,
        right: input.right > 0 ? 1 : 0,
        jumpHeld: input.jumpHeld === true,
        jumpPressed: (previous?.jumpPressed ?? false) || input.jumpPressed === true,
        acc: Math.max(0, Math.min(2, Number(input.acc) || 0)),
        face: input.face < 0 ? -1 : 1,
        uiBlocked: input.uiBlocked === true,
    });
}

function handlePlayerRespawn(sessionId: string): void {
    const remote: Players | undefined = remotePlayers.get(sessionId);
    if (remote === undefined || remote.hp > 0) {return;}

    remote.hp = 20;
    placeNearHost(remote);
    sendPlayerStates();
}

function handleEvent(event: LanEvent): void {
    if (event.type === 'peer:join') {
        if (remotePlayers.has(event.sessionId)) {return;}
        peerCount += 1;
        unknownInputSessions.delete(event.sessionId);
        const remote: Players = spawnRemotePlayer(event.sessionId);
        remotePlayers.set(event.sessionId, remote);
        remoteInputs.set(event.sessionId, createEmptyPlayerInput());
        notifyPeerCount();
        sendSnapshotTo(event.sessionId);
        send({
            type: 'player:join',
            player: makePlayerState(remote, remote.id, 0),
        });
        sendPlayerStates();
        return;
    }

    if (event.type === 'peer:leave') {
        if (!remotePlayers.has(event.sessionId)) {return;}
        remotePlayers.delete(event.sessionId);
        remoteInputs.delete(event.sessionId);
        unknownInputSessions.delete(event.sessionId);
        peerCount = Math.max(0, peerCount - 1);
        notifyPeerCount();
        send({
            type: 'player:leave',
            playerId: event.sessionId,
        });
        return;
    }

    if (event.type === 'player:input') {
        handlePlayerInput(event.sessionId, event.input);
        return;
    }

    if (event.type === 'player:respawn') {
        handlePlayerRespawn(event.sessionId);
    }
}

export function startHosting(onPeerCount?: PeerCountListener): void {
    if (active) {return;}
    active = true;
    peerCount = 0;
    remotePlayers.clear();
    remoteInputs.clear();
    unknownInputSessions.clear();
    // 客户端加入时拿到的快照已带调色板；之后的增量只在调色板增长时下发
    sentPaletteLength = palette.length;
    peerCountListener = onPeerCount ?? null;
    setNetRole('host');

    offEvents = apioxNet.onEvent(handleEvent, true);
    offChunks = eventBus.on('chunk:create', (behind: boolean): void => {
        // 先发送左移前的方块变化，再发送区块；客户端按同样顺序应用。
        flushDiffs();
        sendChunk(behind);
    });

    setWorldStateListener((pos: BlockPos, index: number): void => {
        if (!hasPeers()) {return;}
        pendingDiffs.set(pos.x + ',' + pos.y, { x: pos.x, y: pos.y, index: index });
    });

    diffTimer = apioxTime.setInt(flushDiffs, 100);

    playerTimer = apioxTime.setInt((): void => {
        sendPlayerStates();
    }, PLAYER_INTERVAL_MS);

    inventoryTimer = apioxTime.setInt((): void => {
        if (hasPeers()) {sendInventoryState();}
    }, INVENTORY_INTERVAL_MS);

    timeTimer = apioxTime.setInt((): void => {
        if (hasPeers()) {sendTime();}
    }, TIME_INTERVAL_MS);

    notifyPeerCount();
}

export function stopHosting(): void {
    if (!active) {return;}
    active = false;

    if (offEvents !== null) {
        offEvents();
        offEvents = null;
    }
    if (offChunks !== null) {
        offChunks();
        offChunks = null;
    }
    setWorldStateListener(null);
    if (diffTimer !== null) {
        apioxTime.clearInt(diffTimer);
        diffTimer = null;
    }
    pendingDiffs.clear();
    if (playerTimer !== null) {
        apioxTime.clearInt(playerTimer);
        playerTimer = null;
    }
    if (inventoryTimer !== null) {
        apioxTime.clearInt(inventoryTimer);
        inventoryTimer = null;
    }
    if (timeTimer !== null) {
        apioxTime.clearInt(timeTimer);
        timeTimer = null;
    }

    remotePlayers.clear();
    remoteInputs.clear();
    unknownInputSessions.clear();
    sentPaletteLength = -1;
    peerCount = 0;
    peerCountListener = null;
    apioxNet.clearEventLog();
    setNetRole('single');
}
