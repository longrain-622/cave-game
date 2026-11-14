import { apioxNet } from '../../apiox/net.js';
import { apioxTime } from '../../apiox/time.js';
import { buildWorldArchive } from '../../user/saveWorld.js';
import { player } from '../player.js';
import { inventory, widgets } from '../gui/gameGUI/inventory.js';
import { clock } from '../nature/sky.js';
import { chunk, palette, setWorldStateListener, world } from '../world.js';
import type { BlockPos } from '../world.js';
import { eventBus } from '../others/eventBus.js';
import { setNetRole } from '../session.js';
import type {
    HostToServerMessage,
    InventoryStateMessage,
    LanEvent,
    LanSnapshot,
    PlayerStateMessage,
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

const PLAYER_INTERVAL_MS: number = 50;
const INVENTORY_INTERVAL_MS: number = 500;
const TIME_INTERVAL_MS: number = 1000;

function notifyPeerCount(): void {
    if (peerCountListener !== null) {
        peerCountListener(peerCount);
    }
}

function send(message: HostToServerMessage): void {
    apioxNet.sendHostMessage(message);
}

function buildSnapshot(): LanSnapshot {
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
        player: archive.player,
        inventory: archive.inventory,
    };
}

function sendPlayerState(): void {
    const message: PlayerStateMessage = {
        type: 'player:state',
        hp: player.hp,
        x: player.x,
        y: player.y,
        face: player.face,
        acc: player.acc,
        legRad: player.leg_rad,
        handRad: player.hand_rad,
        needRotateHand: player.needRotateHand,
        isRotateRighthand: player.isRotateRighthand,
        rightOnMouse: player.rightOnMouse,
        state: player.state,
        selectedSlot: widgets.select,
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

function flushDiffs(): void {
    if (pendingDiffs.size === 0) {return;}

    const cells: WorldDiffCell[] = Array.from(pendingDiffs.values());
    pendingDiffs.clear();
    if (peerCount <= 0) {return;}

    const message: WorldDiffMessage = {
        type: 'world:diff',
        cells: cells,
        palette: palette.slice(),
    };
    send(message);
}

function sendChunk(behind: boolean): void {
    if (peerCount <= 0) {return;}

    const width: number = chunk.width;
    const message: WorldChunkMessage = {
        type: 'world:chunk',
        behind: behind,
        chunkData: world.map((row: number[]): number[] => (
            behind ? row.slice(row.length - width) : row.slice(0, width)
        )),
        palette: palette.slice(),
        chunkNum: chunk.num,
        chunkStartX: chunk.start_x,
        chunkLeftNumber: chunk.left_number,
    };

    send(message);
}

function sendSnapshotTo(sessionId: string): void {
    send({
        type: 'snapshot',
        target: sessionId,
        snapshot: buildSnapshot(),
    });
    sendPlayerState();
    sendInventoryState();
    sendTime();
}

function handleEvent(event: LanEvent): void {
    if (event.type === 'peer:join') {
        peerCount += 1;
        notifyPeerCount();
        pendingDiffs.clear();
        sendSnapshotTo(event.sessionId);
        return;
    }

    if (event.type === 'peer:leave') {
        peerCount = Math.max(0, peerCount - 1);
        notifyPeerCount();
    }
}

export function startHosting(onPeerCount?: PeerCountListener): void {
    if (active) {return;}
    active = true;
    peerCount = 0;
    peerCountListener = onPeerCount ?? null;
    setNetRole('host');

    offEvents = apioxNet.onEvent(handleEvent);
    offChunks = eventBus.on('chunk:create', (behind: boolean): void => {
        // 先发送左移前的方块变化，再发送区块；客户端按同样顺序应用。
        flushDiffs();
        sendChunk(behind);
    });

    setWorldStateListener((pos: BlockPos, index: number): void => {
        if (peerCount <= 0) {return;}
        pendingDiffs.set(pos.x + ',' + pos.y, { x: pos.x, y: pos.y, index: index });
    });

    diffTimer = apioxTime.setInt(flushDiffs, 100);

    playerTimer = apioxTime.setInt((): void => {
        if (peerCount > 0) {sendPlayerState();}
    }, PLAYER_INTERVAL_MS);

    inventoryTimer = apioxTime.setInt((): void => {
        if (peerCount > 0) {sendInventoryState();}
    }, INVENTORY_INTERVAL_MS);

    timeTimer = apioxTime.setInt((): void => {
        if (peerCount > 0) {sendTime();}
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

    peerCount = 0;
    peerCountListener = null;
    setNetRole('single');
}
