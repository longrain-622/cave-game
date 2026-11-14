import { apioxNet } from '../../apiox/net.js';
import { apioxTime } from '../../apiox/time.js';
import { reloadPage } from '../../apiox/method.js';
import { player, playerState, createPlayer, remotePlayers } from '../player.js';
import type { Players } from '../player.js';
import { inventory } from '../gui/gameGUI/inventory.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { clock } from '../nature/sky.js';
import { chunk, isOutOfBounds, lightPos, loadPalette, place_meeting, pushChunkToWorld, world } from '../world.js';
import { offsetElements } from '../nature/offsetElements.js';
import { getLanPlayers, getSessionId } from '../session.js';
import { uistate } from '../gui/uiState.js';
import type {
    InventoryStateMessage,
    LanEvent,
    LanPlayerState,
    WorldChunkMessage,
    WorldDiffMessage,
} from '../../../shared/netProtocol.js';

const SNAP_DISTANCE_PX: number = 5 * 64;
const INTERPOLATION_RATE: number = 0.35;
// 每收到一个主机状态包，就把本地预测位置向主机权威位置收敛这个比例。
// 30Hz 状态下误差会在约 0.2s 内收敛，且稳态时误差为 0，不会残留偏移。
const CORRECTION_RATE: number = 0.25;
// 单个状态包最多校正的像素，避免大误差一次拉回去产生瞬移感
const CORRECTION_MAX_STEP_PX: number = 8;
// 兜底：若连续校正一直被地形挡住，定时把累计漂移一次性抹平
const DRIFT_GUARD_INTERVAL_MS: number = 3000;
const DRIFT_SNAP_DISTANCE_PX: number = 2 * 64;
const REMOTE_TIMEOUT_MS: number = 8000;

let active: boolean = false;
let disconnected: boolean = false;
let offEvents: (() => void) | null = null;
let driftGuardTimer: number | null = null;
let targetX: number = 0;
let targetY: number = 0;
let lastOwnStateAt: number = 0;
const remoteTargets: Map<string, { x: number; y: number }> = new Map();
const remoteSeen: Map<string, number> = new Map();

function handleDisconnect(reason: string): void {
    if (disconnected) {return;}
    disconnected = true;

    console.warn('LAN connection ended:', reason);
    void apioxNet.leave().catch((): void => {});

    apioxTime.setOut((): void => {
        reloadPage();
    }, 800);
}

function applyPlayerFields(target: Players, state: LanPlayerState): void {
    target.hp = state.hp;
    target.face = state.face;
    target.acc = state.acc;
    target.leg_rad = state.legRad;
    target.hand_rad = state.handRad;
    target.needRotateHand = state.needRotateHand;
    target.isRotateRighthand = state.isRotateRighthand;
    target.rightOnMouse = state.rightOnMouse;
    target.state = state.state as playerState;
}

function ensureRemote(playerId: string): Players {
    let remote: Players | undefined = remotePlayers.get(playerId);
    if (remote === undefined) {
        remote = createPlayer(playerId);
        remotePlayers.set(playerId, remote);
    }
    return remote;
}

// 与 playerMove / playerJump 使用同样的探测点，保证校正不会把玩家推进方块
function canShiftX(nextX: number, y: number, step: number): boolean {
    const edgeX: number = nextX + (step > 0 ? 64 : 0);
    return !place_meeting(edgeX, y + 120) && !place_meeting(edgeX, y + 20);
}

function canShiftY(x: number, nextY: number, step: number): boolean {
    if (step < 0) {return !place_meeting(x + 32, nextY);}
    return !place_meeting(x + 8, nextY + 128) && !place_meeting(x + 56, nextY + 128);
}

function clampCorrectionStep(value: number): number {
    return Math.max(-CORRECTION_MAX_STEP_PX, Math.min(CORRECTION_MAX_STEP_PX, value));
}

// 把本地预测位置向主机权威位置收敛；每个状态包执行一次，等于 30Hz 的定时校正
function reconcileOwnPosition(): void {
    const errorX: number = targetX - player.x;
    const errorY: number = targetY - player.y;

    if (Math.abs(errorX) > SNAP_DISTANCE_PX || Math.abs(errorY) > SNAP_DISTANCE_PX) {
        player.x = targetX;
        player.y = targetY;
        return;
    }

    const stepX: number = clampCorrectionStep(errorX * CORRECTION_RATE);
    if (stepX !== 0 && canShiftX(player.x + stepX, player.y, stepX)) {
        player.x += stepX;
    }

    const stepY: number = clampCorrectionStep(errorY * CORRECTION_RATE);
    if (stepY !== 0 && canShiftY(player.x, player.y + stepY, stepY)) {
        player.y += stepY;
    }
}

function applyOwnPlayerState(state: LanPlayerState): void {
    // 自己的位置由本地预测推进，这里同步主机权威的 HP 并持续校正位置
    player.hp = state.hp;
    uistate.deathUI_isOpening = player.hp <= 0;
    targetX = state.x;
    targetY = state.y;
    lastOwnStateAt = Date.now();
    reconcileOwnPosition();
}

function applyPlayerState(state: LanPlayerState): void {
    if (state.playerId === getSessionId()) {
        applyOwnPlayerState(state);
        return;
    }

    const remote: Players = ensureRemote(state.playerId);
    applyPlayerFields(remote, state);
    remoteTargets.set(state.playerId, { x: state.x, y: state.y });
    remoteSeen.set(state.playerId, Date.now());

    if (Math.abs(remote.x - state.x) > SNAP_DISTANCE_PX || Math.abs(remote.y - state.y) > SNAP_DISTANCE_PX) {
        remote.x = state.x;
        remote.y = state.y;
    }
}

function applyPlayerJoin(state: LanPlayerState): void {
    if (state.playerId === getSessionId()) {return;}

    const remote: Players = ensureRemote(state.playerId);
    applyPlayerFields(remote, state);
    remote.x = state.x;
    remote.y = state.y;
    remoteTargets.set(state.playerId, { x: state.x, y: state.y });
    remoteSeen.set(state.playerId, Date.now());
}

function applyPlayerLeave(playerId: string): void {
    remotePlayers.delete(playerId);
    remoteTargets.delete(playerId);
    remoteSeen.delete(playerId);
}

function applyInventoryState(message: InventoryStateMessage): void {
    inventory.items.length = 0;
    for (const slot of message.items) {
        inventory.items.push(new Slots(slot.item, slot.num, slot.durability));
    }
}

function applyWorldDiff(message: WorldDiffMessage): void {
    if (message.palette !== undefined) {
        loadPalette(message.palette);
    }

    for (const cell of message.cells) {
        if (isOutOfBounds(cell.y, cell.x)) {continue;}
        world[cell.y][cell.x] = cell.index;
        lightPos.push(
            { x: cell.x, y: cell.y },
            { x: cell.x - 1, y: cell.y },
            { x: cell.x + 1, y: cell.y },
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y + 1 }
        );
    }
}

function applyWorldChunk(message: WorldChunkMessage): void {
    if (message.palette !== undefined) {
        loadPalette(message.palette);
    }
    pushChunkToWorld(message.chunkData, message.behind);
    chunk.num = message.chunkNum;
    chunk.start_x = message.chunkStartX;
    chunk.left_number = message.chunkLeftNumber;

    if (!message.behind) {
        const offset: number = chunk.width * 64;
        targetX += offset;
        for (const target of remoteTargets.values()) {
            target.x += offset;
        }
    }

    offsetElements(message.behind);
}

function handleEvent(event: LanEvent): void {
    switch (event.type) {
        case 'players:state':
            for (const state of event.players) {
                applyPlayerState(state);
            }
            break;
        case 'player:join':
            applyPlayerJoin(event.player);
            break;
        case 'player:leave':
            applyPlayerLeave(event.playerId);
            break;
        case 'inventory:state':
            applyInventoryState(event.data);
            break;
        case 'world:diff':
            applyWorldDiff(event.data);
            break;
        case 'world:chunk':
            applyWorldChunk(event.data);
            break;
        case 'time':
            clock.timer = event.timer;
            break;
        case 'host:stop':
            handleDisconnect(event.reason ?? 'host stopped');
            break;
        case 'net:error':
            handleDisconnect(event.message);
            break;
        default:
            break;
    }
}

// 兜底刷新：连续校正可能被地形挡住而残留漂移，定时检查并一次性对齐
function startDriftGuard(): void {
    if (driftGuardTimer !== null) {return;}
    driftGuardTimer = apioxTime.setInt((): void => {
        // 主机长时间没发状态时不要用旧目标硬拉，避免主机卡顿时把房客拽回去
        if (Date.now() - lastOwnStateAt > DRIFT_GUARD_INTERVAL_MS) {return;}

        const errorX: number = targetX - player.x;
        const errorY: number = targetY - player.y;
        if (Math.abs(errorX) <= DRIFT_SNAP_DISTANCE_PX && Math.abs(errorY) <= DRIFT_SNAP_DISTANCE_PX) {return;}

        console.warn('[lan] forced position resync', Math.round(errorX), Math.round(errorY));
        player.x = targetX;
        player.y = targetY;
    }, DRIFT_GUARD_INTERVAL_MS);
}

function stopDriftGuard(): void {
    if (driftGuardTimer === null) {return;}
    apioxTime.clearInt(driftGuardTimer);
    driftGuardTimer = null;
}

export function startClientNet(): void {
    if (active) {return;}
    active = true;
    disconnected = false;

    remotePlayers.clear();
    remoteTargets.clear();
    remoteSeen.clear();

    const ownId: string | null = getSessionId();
    if (ownId !== null) {player.id = ownId;}
    const now: number = Date.now();
    for (const state of getLanPlayers()) {
        if (state.playerId === ownId) {continue;}
        const remote: Players = ensureRemote(state.playerId);
        applyPlayerFields(remote, state);
        remote.x = state.x;
        remote.y = state.y;
        remoteTargets.set(state.playerId, { x: state.x, y: state.y });
        remoteSeen.set(state.playerId, now);
    }

    targetX = player.x;
    targetY = player.y;
    lastOwnStateAt = now;
    startDriftGuard();
    offEvents = apioxNet.onEvent(handleEvent, true);
}

export function clientNetTick(delta: number): void {
    if (!active) {return;}

    // 自己的位置已由 applyClientPrediction 在本地推进；这里只做远端插值与超时清理
    const t: number = Math.min(1, Math.max(0, delta * INTERPOLATION_RATE));
    for (const [playerId, remote] of remotePlayers) {
        const target = remoteTargets.get(playerId);
        if (target === undefined) {continue;}

        const dx: number = target.x - remote.x;
        const dy: number = target.y - remote.y;
        if (Math.abs(dx) > SNAP_DISTANCE_PX || Math.abs(dy) > SNAP_DISTANCE_PX) {
            remote.x = target.x;
            remote.y = target.y;
        } else {
            remote.x += dx * t;
            remote.y += dy * t;
        }
    }

    const now: number = Date.now();
    for (const [playerId] of remotePlayers) {
        const seen: number = remoteSeen.get(playerId) ?? 0;
        if (now - seen > REMOTE_TIMEOUT_MS) {
            applyPlayerLeave(playerId);
        }
    }
}

export function requestRespawn(): void {
    apioxNet.sendClientMessage({
        type: 'player:respawn',
        seq: Date.now(),
    });
}

export function stopClientNet(): void {
    if (!active) {return;}
    active = false;

    stopDriftGuard();

    if (offEvents !== null) {
        offEvents();
        offEvents = null;
    }

    remotePlayers.clear();
    remoteTargets.clear();
    remoteSeen.clear();
    apioxNet.clearEventLog();
}
