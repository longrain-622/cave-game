import { apioxNet } from '../../apiox/net.js';
import { apioxTime } from '../../apiox/time.js';
import { reloadPage } from '../../apiox/method.js';
import { player, playerState, createPlayer, remotePlayers, restorePlayerState, capturePlayerState, applyClientPrediction, setPlayerReplayMode } from '../player.js';
import type { Players } from '../player.js';
import { inventory } from '../gui/gameGUI/inventory.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { clock } from '../nature/sky.js';
import { chunk, isOutOfBounds, lightPos, loadPalette, pushChunkToWorld, world } from '../world.js';
import { offsetElements } from '../nature/offsetElements.js';
import { getLanPlayers, getSessionId } from '../session.js';
import { uistate } from '../gui/uiState.js';
import type {
    InventoryStateMessage,
    LanEvent,
    LanPlayerState,
    WorldChunkMessage,
    WorldDiffMessage,
    PlayerInputState
} from '../../../shared/netProtocol.js';

// 回滚重放参数
const MAX_HISTORY_FRAMES: number = 120; // 保留最近约 2 秒
const ROLLBACK_EPSILON_PX: number = 0.5; // 小于它视为一致
const ROLLBACK_SNAP_PX: number = 5 * 64; // 超过它直接瞬移
const MAX_REPLAY_FRAMES: number = 60; // 单次重放上限，防卡顿后爆帧

interface HistoryEntry {
    input: PlayerInputState;
    delta: number;
    state: Players;
}

const predictionHistory: Map<number, HistoryEntry> = new Map();
let latestPredictedTick: number = 0;
// 只有主机发来的 hp 才算数，用来识别"死亡→重生"这类必须整体对齐的跳变
let lastHostHp: number = 20;

const SNAP_DISTANCE_PX: number = 5 * 64;
const INTERPOLATION_RATE: number = 0.5;
const REMOTE_TIMEOUT_MS: number = 8000;

let active: boolean = false;
let disconnected: boolean = false;
let offEvents: (() => void) | null = null;
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

function applyOwnPlayerState(state: LanPlayerState): void {
    // hp 只认主机：回放会重算历史，不能让摔落伤害在重放里再扣一次
    const authoritativeHp: number = state.hp;
    const respawned: boolean = lastHostHp <= 0 && authoritativeHp > 0;
    lastHostHp = authoritativeHp;
    player.hp = authoritativeHp;
    uistate.deathUI_isOpening = authoritativeHp <= 0;

    // 重生 / 传送：主机直接改了坐标，ack 快照还是旧位置，比对根本看不出来，只能整体对齐。
    // 旧历史已经不在同一坐标系里，清掉等 ack 追上来再继续比对。
    if (respawned
        || Math.abs(state.x - player.x) > ROLLBACK_SNAP_PX
        || Math.abs(state.y - player.y) > ROLLBACK_SNAP_PX) {
        player.x = state.x;
        player.y = state.y;
        predictionHistory.clear();
        return;
    }

    const ackTick: number = state.ackInputTick;
    const ackX: number = Number.isFinite(state.ackX) ? state.ackX : state.x;
    const ackY: number = Number.isFinite(state.ackY) ? state.ackY : state.y;
    const ackRecord: HistoryEntry | undefined = predictionHistory.get(ackTick);

    // 没有可比对的基准（主机还没消费过输入，或刚清过历史）：直接接受本地预测
    if (ackTick <= 0 || ackRecord === undefined) {
        return;
    }

    const dx: number = ackX - ackRecord.state.x;
    const dy: number = ackY - ackRecord.state.y;
    // 主机消费 ackInputTick 后模拟出的状态和客户端 history[ackInputTick] 是同一模拟步，
    // 正常应完全一致；这里只留浮点误差余量，不能随延迟放大，否则会放过真正的分歧。
    if (Math.abs(dx) <= ROLLBACK_EPSILON_PX && Math.abs(dy) <= ROLLBACK_EPSILON_PX) {
        return; // 预测有效，什么都不用做
    }

    // 主机落后太多（重放上限补不到最新一帧）时，继续回滚重放会让历史与实时状态错位，
    // 直接按主机当前位置整体对齐，避免每帧做大量重放。
    if (latestPredictedTick - ackTick > MAX_REPLAY_FRAMES) {
        player.x = state.x;
        player.y = state.y;
        predictionHistory.clear();
        return;
    }

    if (Math.abs(dx) > ROLLBACK_SNAP_PX || Math.abs(dy) > ROLLBACK_SNAP_PX) { // 偏差大到没法有意义地重放，直接对齐
        player.x = state.x;
        player.y = state.y;
        predictionHistory.clear();
        return;
    }

    ackRecord.state.x = ackX; // 用主机在该 tick 的权威状态覆盖历史快照
    ackRecord.state.y = ackY;
    if (Number.isFinite(state.ackHsp)) {ackRecord.state.hsp = state.ackHsp;}
    if (Number.isFinite(state.ackVsp)) {ackRecord.state.vsp = state.ackVsp;}
    if (Number.isFinite(state.ackVyCarry)) {ackRecord.state.vyCarry = state.ackVyCarry;}
    if (typeof state.ackCanJump === 'boolean') {ackRecord.state.can_jump = state.ackCanJump;}

    restorePlayerState(player, ackRecord.state); // 回滚
    player.hp = authoritativeHp;

    // 重放 ackTick+1 .. latestPredictedTick，并同步历史
    let replayed: number = 0;
    setPlayerReplayMode(true);
    for (let t = ackTick + 1; t <= latestPredictedTick; t++) {
        const r: HistoryEntry | undefined = predictionHistory.get(t);
        if (r === undefined) {break;}
        applyClientPrediction(player, r.delta, { ...r.input });
        r.state = capturePlayerState(player); // 保持历史与重放结果一致
        replayed++;
        if (replayed >= MAX_REPLAY_FRAMES) {break;}
    }
    setPlayerReplayMode(false);

    player.hp = authoritativeHp;
    uistate.deathUI_isOpening = authoritativeHp <= 0;
}

function applyPlayerState(state: LanPlayerState): void {
    if (state.playerId === getSessionId()) {
        applyOwnPlayerState(state);
        return;
    }

    const remote: Players = ensureRemote(state.playerId);
    applyPlayerFields(remote, state);
    remoteTargets.set(state.playerId, { x: state.x, y: state.y });
    remoteSeen.set(state.playerId, apioxTime.now());

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
    remoteSeen.set(state.playerId, apioxTime.now());
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
    if (message.palette !== undefined) {loadPalette(message.palette);}
    pushChunkToWorld(message.chunkData, message.behind);
    chunk.num = message.chunkNum;
    chunk.start_x = message.chunkStartX;
    chunk.left_number = message.chunkLeftNumber;

    if (!message.behind) {
        const offset: number = chunk.width * 64;
        for (const target of remoteTargets.values()) {
            target.x += offset;
        }
        for (const entry of predictionHistory.values()) {
            entry.state.x += offset;
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

export function startClientNet(): void {
    if (active) {return;}
    active = true;
    disconnected = false;

    remotePlayers.clear();
    remoteTargets.clear();
    remoteSeen.clear();
    predictionHistory.clear();
    latestPredictedTick = 0;
    lastHostHp = player.hp;

    const ownId: string | null = getSessionId();
    if (ownId !== null) {player.id = ownId;}
    const now: number = apioxTime.now();
    for (const state of getLanPlayers()) {
        if (state.playerId === ownId) {continue;}
        const remote: Players = ensureRemote(state.playerId);
        applyPlayerFields(remote, state);
        remote.x = state.x;
        remote.y = state.y;
        remoteTargets.set(state.playerId, { x: state.x, y: state.y });
        remoteSeen.set(state.playerId, now);
    }

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

    const now: number = apioxTime.now();
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
        seq: apioxTime.now(),
    });
}

export function stopClientNet(): void {
    if (!active) {return;}
    active = false;

    if (offEvents !== null) {
        offEvents();
        offEvents = null;
    }

    remotePlayers.clear();
    remoteTargets.clear();
    remoteSeen.clear();
    apioxNet.clearEventLog();
}

export function recordPredictedFrame(input: PlayerInputState, delta: number): void {
    predictionHistory.set(input.tick, {
        input: input,
        delta: delta,
        state: capturePlayerState(player),
    });
    if (input.tick > latestPredictedTick) {latestPredictedTick = input.tick;}

    const cutoff: number = latestPredictedTick - MAX_HISTORY_FRAMES;
    if (cutoff > 0) {
        for (const t of predictionHistory.keys()) {
            if (t < cutoff) {predictionHistory.delete(t);}
        }
    }
}
