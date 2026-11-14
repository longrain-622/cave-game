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
    };

    return newPlayer;
}

function initPlayer(player: Players, readingWorld: WorldArchive | null): void {
    if (coverWhenSave && notNullUndefined(readingWorld) && notNullUndefined(readingWorld.player)) {
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

export function playerHurt(p: Players, howmany: number): void {
    p.hp -= howmany;
    if (p === player) {eventBusSwitch.playerHurt++;}
}

const player: Players = createPlayer(HOST_PLAYER_ID);
export const remotePlayers: Map<string, Players> = new Map();
export const remoteInputs: Map<string, PlayerInputState> = new Map();

export function createEmptyPlayerInput(): PlayerInputState {
    return {
        left: 0,
        right: 0,
        jumpHeld: false,
        jumpPressed: false,
        acc: 0,
        face: -1,
        uiBlocked: false,
    };
}

// 某个像素点是否处于水方块中
function isWaterAt(x: number, y: number): boolean {
    return blockTypeAt(Math.floor(x / 64), Math.floor(y / 64)) === idOfBlock.water;
}

// 刷新玩家状态
export function updatePlayerState(p: Players): void {
    const headInWater: boolean = isWaterAt(p.x + 32, p.y + 8); // 头顶
    const bodyInWater: boolean = isWaterAt(p.x + 32, p.y + 64); // 身体中部
    const feetInWater: boolean = isWaterAt(p.x + 32, p.y + 120); // 脚底
    const lastState: number = p.state;
    p.state = (headInWater || bodyInWater || feetInWater) ? playerState.swimming : playerState.normal;

    if (p === player && lastState !== p.state && p.state === playerState.swimming) {
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

    // 改变玩家腿部旋转方向
    if (p.state === playerState.swimming) {
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

    // 改变玩家手旋转方向
    if (p.needRotateHand) {
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
    if (p.vsp != 0) {
        for (let i = 0; i < Math.abs(p.vsp); i++) {
            if (p.vsp > 0) {
                if (!(place_meeting(p.x+8, p.y+128) || place_meeting(p.x + 56, p.y + 128))) {
                    p.y++;
                } else {
                    const fallSpeed = p.vsp;
                    if (fallSpeed > 16) {
                        playerHurt(p, Math.floor((fallSpeed - 16) / 2)); // 计算摔落伤害
                    }

                    p.vsp = 0;
                    p.can_jump = true;
                    break;
                }
            } else {
                if (!place_meeting(p.x+32, p.y)) {
                    p.y--;
                } else {
                    p.vsp = 0;
                    break;
                }
            }
        }
    }
    if (!(place_meeting(p.x + 8, p.y + 128) || place_meeting(p.x + 56, p.y + 128))){
        p.can_jump = false;
    }
}

function main(): void {
    initPlayer(player, readingWorld);
}
main();

// uiBlocked / pointerScreenX 由输入适配层传入；逻辑层不再 import 输入或 UI。
function playerLoop(delta: number, uiBlocked: boolean, pointerScreenX: number): void {
    player.rightOnMouse = pointerScreenX > player.screen_x + player.width / 2;

    if (!uiBlocked && player.hp > 0) {
        playerMove(player, delta);
    }

    if (player.hp > 0) {playerJump(player, delta);}
}

// 主机侧推进一个客户端玩家；输入来自网络，位置/HP 仍由主机权威计算。
export function stepRemotePlayer(p: Players, delta: number, input: PlayerInputState): void {
    p.left = input.left;
    p.right = input.right;
    p.jumpHeld = input.jumpHeld;
    p.face = input.face;
    p.acc = input.acc;
    p.rightOnMouse = false;

    if (!input.uiBlocked && input.jumpPressed && p.hp > 0 && p.can_jump && p.state !== playerState.swimming) {
        p.vsp = p.jumpspeed;
        p.can_jump = false;
    }

    if (!input.uiBlocked && p.hp > 0) {
        playerMove(p, delta);
    }

    if (p.hp > 0) {playerJump(p, delta);}
    input.jumpPressed = false;
}

// 客户端本地预测：输入立即推进自己的角色，主机状态随后做软校正。
// 与主机共用同一套物理，正常网络延迟下两边位置基本一致。
export function applyClientPrediction(p: Players, delta: number, input: PlayerInputState): void {
    updatePlayerState(p);
    stepRemotePlayer(p, delta, input);
}

export { player, playerLoop };