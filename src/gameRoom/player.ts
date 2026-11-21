import { world_height, world, chunk, place_meeting, blockTypeAt } from './world.js';
import { room } from '../constants/generic.js';
import { WorldArchive } from '../types/worldArchive.js';
import { readingWorld, coverWhenSave, eventBusSwitch } from './gameState.js';
import { notNullUndefined } from '../constants/utils.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';
import { HOST_PLAYER_ID } from '../../shared/netProtocol.js';
import type { PlayerInputState } from '../../shared/netProtocol.js';

export enum playerState {
    normal, swimming
}

// 游泳物理参数
const waterGravRatio: number = 0.6; // 水中重力衰减比例
const waterDrag: number = 0.1; // 水的阻力系数：越小惯性越明显（出水能弹多远、入水能沉多深都看它）
const swimThrust: number = 1; // 水中按住跳跃键的向上推力（像素/帧²）
const swimSpeedRatio: number = 0.4; // 水中水平移动速度比例
const minRiseVsp: number = 3; // 按住跳跃时的最小上浮速度（像素/帧），决定振幅下限
const airAccel: number = 0.5; // // 空中按住方向键时水平方向上的加速度

export interface Players {
    id: string;
    hp: number;
    face: number;
    x: number;
    y: number;
    screen_x: number;
    screen_y: number;
    left: number;
    right: number;
    width: number;
    height: number;

    move_speed: number;
    acc: number;
    grav: number;
    jumpspeed: number;
    vsp: number;
    hsp: number;
    can_jump: boolean;

    leg_rad: number;
    hand_rad: number;
    needRotateHand: boolean; 
    isRotateRighthand: boolean;
    rightOnMouse: boolean;

    state: playerState;
    jumpHeld: boolean;

    /** 最近一次被网络输入消费的 tick，以及消费后那一帧结束时的位置（回滚对齐基准）。 */
    ackTick: number;
    ackX: number;
    ackY: number;
    ackHsp: number;
    ackVsp: number;
    ackVyCarry: number;
    ackCanJump: boolean;
    vyCarry: number; // 垂直逐像素步进累计的小数余量，让下落距离不随帧率变化
    nextInputTick: number; // 主机期望消费的下一个 tick；0 表示尚未收到任何输入
}

export function createPlayer(id: string): Players {
    const newPlayer: Players = {
        id: id,
        hp: 20,
        face: -1,
        x: (world[0].length / 2) * 64,
        y: Math.floor(world_height / 2) * 64 - 300,
        screen_x: room.width / 2,
        screen_y: room.height / 2 - 40,
        left: 0,
        right: 0,
        width: 64,
        height: 128,

        move_speed: 4.5,
        acc: 0,
        grav: 0.5,
        jumpspeed: -10,
        vsp: 0,
        hsp: 0,
        can_jump: false,

        leg_rad: 0,
        hand_rad: 0,
        needRotateHand: false,
        isRotateRighthand: false,
        rightOnMouse: false,

        state: playerState.normal,
        jumpHeld: false,

        ackTick: 0,
        ackX: 0,
        ackY: 0,
        ackHsp: 0,
        ackVsp: 0,
        ackVyCarry: 0,
        ackCanJump: false,
        vyCarry: 0,
        nextInputTick: 0,
    };

    return newPlayer;
}

function initPlayer(
    player: Players,
    readingWorld: WorldArchive | null
): void {
    if (
        coverWhenSave &&
        notNullUndefined(readingWorld) &&
        notNullUndefined(readingWorld.player)
    ) {
        player.hp = readingWorld.player.hp;
        player.x = readingWorld.player.x;
        player.y = readingWorld.player.y;
    }
}

export function initPlayerPosition(player: Players): void { // 初始化玩家坐标,在createWorld.js中调用
    player.x = chunk.num * chunk.width * 64 / 2;
    let i: number = 0;
    while (blockTypeAt(Math.floor(player.x / 64), i) === -1) {i++;}
    player.y = i * 64 - 256;
}

let replaying: boolean = false; // 回滚重放期间不触发受击事件：重放只是重算历史，不该再放一次音效/抖屏

export function setPlayerReplayMode(on: boolean): void {
    replaying = on;
}

export function playerHurt(p: Players, howmany: number): void {
    p.hp -= howmany;
    if (p === player && !replaying) {
        eventBusSwitch.playerHurt++;
    }
}

export const player: Players = createPlayer(HOST_PLAYER_ID);
export const remotePlayers: Map<string, Players> = new Map();

export function capturePlayerState(p: Players): Players {
    return { ...p };
}

export function restorePlayerState(p: Players, snap: Players): void {
    Object.assign(p, snap);
}

function isWaterAt(x: number, y: number): boolean { // 某个像素点是否处于水方块中
    return blockTypeAt(Math.floor(x / 64), Math.floor(y / 64)) === idOfBlock.water;
}

export function updatePlayerState(p: Players): void { // 刷新玩家状态
    const headInWater: boolean = isWaterAt(p.x + 32, p.y + 8); // 头顶
    const bodyInWater: boolean = isWaterAt(p.x + 32, p.y + 64); // 身体中部
    const feetInWater: boolean = isWaterAt(p.x + 32, p.y + 120); // 脚底
    const lastState: number = p.state;
    p.state = (headInWater || bodyInWater || feetInWater) ? playerState.swimming : playerState.normal;

    if (
        p === player &&
        lastState !== p.state &&
        p.state === playerState.swimming
    ) {
        eventBusSwitch.playerFallinWater++;
    }
}

function playerMove(p: Players, delta: number): void { // 玩家移动
    let dir = p.right - p.left;

    if (p.state === playerState.swimming) {
        p.hsp = dir * (p.move_speed + p.acc) * swimSpeedRatio;
    } else if (p.can_jump) {
        p.hsp = dir * (p.move_speed + p.acc);
    } else if (dir !== 0) {
        const target: number = dir * (p.move_speed + p.acc);
        if (p.hsp < target) {
            p.hsp = Math.min(p.hsp + airAccel * delta, target);
        } else if (p.hsp > target) {
            p.hsp = Math.max(p.hsp - airAccel * delta, target);
        }
    } else {
        if (p.hsp >= 0.3) {p.hsp -= 0.3 * delta;}
        else if (p.hsp <= -0.3) {p.hsp += 0.3 * delta;}
        else {p.hsp = 0;}
    }

    if (p.hsp !== 0) {
        const edgeX: number = p.x + (p.hsp > 0 ? 64 : 0);
        if (!place_meeting(edgeX, p.y + 120)
        && !place_meeting(edgeX, p.y + 20)) {
            p.x += p.hsp * delta;
        }
    }

    if (p.state === playerState.swimming) { // 改变玩家腿部旋转方向
        const kicking: boolean = p.left === 1 || p.right === 1 || p.jumpHeld;
        if (kicking || (p.leg_rad !== 0 && p.leg_rad < 2 * Math.PI)) {
            p.leg_rad += 0.4 * delta;
            if (p.leg_rad >= 2 * Math.PI){p.leg_rad = 0;}
        }
    } else if (p.left === 1 || p.right === 1) {
        p.leg_rad += (0.3 + p.acc / 48) * delta;
        if (p.leg_rad >= 2 * Math.PI){p.leg_rad = 0;}
    } else {
        if (p.leg_rad !== 0 && p.leg_rad < 2 * Math.PI) {
            p.leg_rad += 0.3 * delta;
            if (p.leg_rad >= 2 * Math.PI) {p.leg_rad = 0;}
        }
    }

    if (p.needRotateHand) { // 改变玩家手旋转方向
        if (p.rightOnMouse) {p.isRotateRighthand = true;}
        else {p.isRotateRighthand = false;}

        p.hand_rad += 0.3 * delta;
        if (p.hand_rad >= Math.PI) {
            p.needRotateHand = false;
            p.hand_rad = 0;
        }
    } else {
        p.hand_rad = 0;
    }
}

function playerJump(p: Players, delta: number): void { // 玩家跳跃（水中为划水与水的阻力）
    if (isWaterAt(p.x + 32, p.y + 120)) {
        p.vsp += p.grav * waterGravRatio * delta;
        if (p.jumpHeld) {p.vsp -= swimThrust * delta;}
        p.vsp -= p.vsp * waterDrag * delta;

        if (p.jumpHeld && p.vsp < 0 && p.vsp > -minRiseVsp) {
            p.vsp = -minRiseVsp;
        }
    } else {
        p.vsp += p.grav * delta;
    }

    const movePx: number = p.vsp * delta + p.vyCarry;
    const steps: number = Math.round(movePx);
    p.vyCarry = movePx - steps;

    if (steps !== 0) {
        for (let i = 0; i < Math.abs(steps); i++) {
            if (steps > 0) {
                if (!(place_meeting(p.x+8, p.y+128) || place_meeting(p.x + 56, p.y + 128))) {
                    p.y++;
                } else {
                    const fallSpeed = p.vsp;
                    if (fallSpeed > 16) {
                        playerHurt(p, Math.floor((fallSpeed - 16) / 2)); // 计算摔落伤害
                    }

                    p.vsp = 0;
                    p.can_jump = true;
                    p.vyCarry = 0;
                    break;
                }
            } else {
                if (!place_meeting(p.x+32, p.y)) {
                    p.y--;
                } else {
                    p.vsp = 0;
                    p.vyCarry = 0;
                    break;
                }
            }
        }
    }
    if (
        !(place_meeting(p.x + 8, p.y + 128) ||
        place_meeting(p.x + 56, p.y + 128))
    ) {
        p.can_jump = false;
    }
}

function main(): void {
    initPlayer(player, readingWorld);
}
main();

export function playerLoop(
    delta: number,
    uiBlocked: boolean,
    pointerScreenX: number
): void { // uiBlocked / pointerScreenX 由输入适配层传入；逻辑层不再 import 输入或 UI。
    player.rightOnMouse = pointerScreenX > player.screen_x + player.width / 2;

    if (!uiBlocked && player.hp > 0) {
        playerMove(player, delta);
    }

    if (player.hp > 0) {playerJump(player, delta);}
}

export function stepRemotePlayer(
    p: Players,
    delta: number,
    input: PlayerInputState
): void { // 用一个输入推进一帧；主机和客户端预测共用这一套物理，保证两边可复现。
    applyRemoteInput(p, delta, input);
}

export function applyClientPrediction(
    p: Players,
    delta: number,
    input: PlayerInputState
): void { // 客户端本地预测：与主机共用同一套物理，ack 只由主机消费输入时产生。
    updatePlayerState(p);
    stepRemotePlayer(p, delta, input);
}

const remoteInputQueues: Map<string, Map<number, PlayerInputState>> = new Map();
let inputConsumedSinceLastAck: boolean = false;

// 主机每逻辑步默认只消费 1 个输入；有积压时多消费几个追赶，避免一次卡顿造成永久延迟。
const REMOTE_INPUT_CATCHUP_THRESHOLD: number = 4;
const REMOTE_INPUT_CATCHUP_STEPS: number = 3;
// 队列上限（约 10 秒输入）；超出说明主机长时间没有跑逻辑，只能丢掉旧输入跳过去。
const REMOTE_INPUT_QUEUE_LIMIT: number = 600;
// 溢出时保留最近约 2 秒输入，追赶几十帧就能消化，避免直接瞬移太远。
const REMOTE_INPUT_KEEP_ON_OVERFLOW: number = 120;
// 客户端重连/重载后 tick 会从头计数，回退超过这段才当作新的 tick 序列。
const REMOTE_INPUT_TICK_REGRESSION: number = 120;

export function takeInputConsumedFlag(): boolean {
    const consumed: boolean = inputConsumedSinceLastAck;
    inputConsumedSinceLastAck = false;
    return consumed;
}

export function resetInputConsumedFlag(): void {
    inputConsumedSinceLastAck = false;
}

function normalizeInputTick(tick: number): number {
    if (!Number.isFinite(tick)) {return 0;}
    const value: number = Math.floor(tick);
    return value > 0 ? value : 0;
}

function smallestQueuedTick(q: Map<number, PlayerInputState>, minExclusive: number): number {
    let smallest: number = 0;
    for (const tick of q.keys()) {
        if (tick <= minExclusive) {continue;}
        if (smallest === 0 || tick < smallest) {smallest = tick;}
    }
    return smallest;
}

export function enqueueRemoteInput(
    sessionId: string,
    input: PlayerInputState
): void {
    const remote: Players | undefined = remotePlayers.get(sessionId);
    if (remote === undefined) {return;}

    const tick: number = normalizeInputTick(input.tick);
    if (tick === 0) {return;} // 非法 tick 直接丢弃
    const normalized: PlayerInputState = input.tick === tick ? input : { ...input, tick: tick };

    if (remote.nextInputTick !== 0 && tick < remote.nextInputTick - REMOTE_INPUT_TICK_REGRESSION) {
        resetRemoteInput(sessionId); // 客户端重连/tick 回退：重置该 session 的队列与 ack 基准
    }

    let q: Map<number, PlayerInputState> | undefined = remoteInputQueues.get(sessionId);
    if (q === undefined) {
        q = new Map();
        remoteInputQueues.set(sessionId, q);
    }
    if (remote.nextInputTick === 0) {
        remote.nextInputTick = tick; // 首次到达的 tick 作为起点
    }
    if (tick < remote.nextInputTick) {return;} // 已过期
    if (!q.has(tick)) {q.set(tick, normalized);}

    pruneRemoteInputQueue(remote, q);
}

/**
 * 队列超限时只保留最新的几个输入并跳过去。
 * 正在等待的 tick 绝不能被悄悄删掉，否则消费端会永远等一个不会出现的输入。
 */
function pruneRemoteInputQueue(
    remote: Players,
    q: Map<number, PlayerInputState>
): void {
    if (q.size <= REMOTE_INPUT_QUEUE_LIMIT) {return;}

    const ticks: number[] = Array.from(q.keys()).sort((a: number, b: number): number => a - b);
    const keepFrom: number = ticks.length - REMOTE_INPUT_KEEP_ON_OVERFLOW;
    for (let i = 0; i < keepFrom; i++) {
        q.delete(ticks[i]);
    }

    const nextTick: number = smallestQueuedTick(q, 0);
    remote.nextInputTick = nextTick;
    remote.ackTick = 0; // 中间输入被跳过了，旧 ack 不能作为比较基准
}

export function resetRemoteInput(sessionId: string): void {
    remoteInputQueues.delete(sessionId);
    const remote: Players | undefined = remotePlayers.get(sessionId);
    if (remote === undefined) {return;}
    remote.nextInputTick = 0;
    remote.ackTick = 0;
    remote.ackX = remote.x;
    remote.ackY = remote.y;
    remote.ackHsp = remote.hsp;
    remote.ackVsp = remote.vsp;
    remote.ackVyCarry = remote.vyCarry;
    remote.ackCanJump = remote.can_jump;
}

export function clearRemoteInputQueue(sessionId: string): void {
    remoteInputQueues.delete(sessionId);
}

export function clearAllRemoteInputQueues(): void {
    remoteInputQueues.clear();
}

function applyRemoteInput(
    p: Players,
    delta: number,
    input: PlayerInputState
): void {
    p.left = input.left;
    p.right = input.right;
    p.jumpHeld = input.jumpHeld;
    p.face = input.face;
    p.acc = input.acc;

    if (!input.uiBlocked && input.jumpPressed && p.hp > 0 && p.can_jump && p.state !== playerState.swimming) {
        p.vsp = p.jumpspeed;
        p.can_jump = false;
    }
    if (!input.uiBlocked && p.hp > 0) {playerMove(p, delta);}
    if (p.hp > 0) { playerJump(p, delta); }
}

/**
 * 主机每逻辑步调用一次：严格按 tick 顺序消费，每个 tick 只应用一次。
 * 队列有积压时一个逻辑步可以多消费几个输入追赶；缺少下一个 tick 时跳到最近的可用输入，
 * 避免因为丢掉一个输入就让远端玩家永久冻结。
 */
export function stepRemotePlayerFromQueue(
    p: Players,
    delta: number
): void {
    if (p.nextInputTick === 0) {return;}
    const q: Map<number, PlayerInputState> | undefined = remoteInputQueues.get(p.id);
    if (q === undefined) {return;}

    const maxSteps: number = q.size > REMOTE_INPUT_CATCHUP_THRESHOLD ? REMOTE_INPUT_CATCHUP_STEPS : 1;
    let steps: number = 0;

    while (steps < maxSteps) {
        let tick: number = p.nextInputTick;
        if (tick === 0) {break;}
        let input: PlayerInputState | undefined = q.get(tick);
        if (input === undefined) {
            tick = smallestQueuedTick(q, tick); // 断档：跳到最近的可用 tick
            if (tick === 0) {break;} // 后续输入还没到，本帧先不动
            p.nextInputTick = tick;
            input = q.get(tick);
            if (input === undefined) {break;}
        }

        q.delete(tick);
        updatePlayerState(p); // 每个输入对应客户端的一帧，必须先刷新游泳/普通状态再走物理，否则追赶时会和客户端不一致
        applyRemoteInput(p, delta, input);
        p.nextInputTick = tick + 1;
        p.ackTick = tick;
        p.ackX = p.x;
        p.ackY = p.y;
        p.ackHsp = p.hsp;
        p.ackVsp = p.vsp;
        p.ackVyCarry = p.vyCarry;
        p.ackCanJump = p.can_jump;
        inputConsumedSinceLastAck = true;
        steps++;
    }
}
