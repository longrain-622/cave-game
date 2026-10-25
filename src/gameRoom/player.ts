import { world_height, world, chunk, place_meeting, blockTypeAt } from './world.js';
import { enableKeyDoubleClickDetection } from './const.js';
import { room } from '../constants/generic.js';
import { uistate } from './gui/uiState.js';
import { mouse } from './input/mouseState.js';
import { eventBus } from './others/eventBus.js';
import { WorldArchive } from '../types/worldArchive.js';
import { readingWorld, coverWhenSave } from './gameState.js';
import { apioxEvent } from '../apiox/event.js';
import { notNullUndefined } from '../constants/utils.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';

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

interface Players {
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

function newPlayers(): Players {
    const newPlayer: Players = {
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

export function playerHurt(player: Players, howmany: number): void {
    player.hp -= howmany;
    eventBus.emit('player:hurt');
}

const player: Players = newPlayers();

function registerPlayerInput(): void {
    apioxEvent.onKeyDoubleClick((detail): void => {
        if (!(detail.key === 'a' || detail.key === 'd')) {return;}
        if (!(player.state === playerState.normal && player.can_jump)) {return;}
        player.acc = 2;
    });

    apioxEvent.onKeyDown((e): void => {
        if (uistate.invenUI_isOpening()) {return;}
        switch (e.key) {
            case 'a': player.face = -1; player.left = 1; break;
            case 'd': player.face = 1; player.right = 1; break;
            case 'w': case ' ':
                player.jumpHeld = true;
                if (player.state === playerState.swimming) {break;} // 水中上浮由 playerJump 处理
                if (player.can_jump && !uistate.invenUI_isOpening()) {
                    player.vsp = player.jumpspeed;
                    player.can_jump = false;
                }
                break;
        }
    });

    apioxEvent.onKeyUp((e): void => {
        switch (e.key) {
            case 'a': case 'd':
                player.left = 0;
                player.right = 0;
                player.acc = 0;
                break;
            case 'w': case ' ':
                player.jumpHeld = false;
                break;
        }
    });

    apioxEvent.listenGlobal('mousedown', (): void => {
        if (!uistate.invenUI_isOpening() && mouse.can_use) { // 玩家手部旋转触发
            player.needRotateHand = true;
        }
    });
}

// 某个像素点是否处于水方块中
function isWaterAt(x: number, y: number): boolean {
    return blockTypeAt(Math.floor(x / 64), Math.floor(y / 64)) === idOfBlock.water;
}

// 刷新玩家状态
export function updatePlayerState(): void {
    const headInWater: boolean = isWaterAt(player.x + 32, player.y + 8); // 头顶
    const bodyInWater: boolean = isWaterAt(player.x + 32, player.y + 64); // 身体中部
    const feetInWater: boolean = isWaterAt(player.x + 32, player.y + 120); // 脚底
    const lastState: number = player.state;
    player.state = (headInWater || bodyInWater || feetInWater) ? playerState.swimming : playerState.normal;

    if (lastState !== player.state && player.state === playerState.swimming) {
        eventBus.emit('player:fallInWater');
    }
}

function playerMove(delta: number): void { // 玩家移动
    let dir = player.right - player.left;

    if (player.state === playerState.swimming) {
        player.hsp = dir * (player.move_speed + player.acc) * swimSpeedRatio;
    } else if (player.can_jump) {
        player.hsp = dir * (player.move_speed + player.acc);
    } else if (dir !== 0) {
        const target: number = dir * (player.move_speed + player.acc);
        if (player.hsp < target) {
            player.hsp = Math.min(player.hsp + airAccel * delta, target);
        } else if (player.hsp > target) {
            player.hsp = Math.max(player.hsp - airAccel * delta, target);
        }
    } else {
        if (player.hsp >= 0.3) {player.hsp -= 0.3 * delta;}
        else if (player.hsp <= -0.3) {player.hsp += 0.3 * delta;}
        else {player.hsp = 0;}
    }

    if (player.hsp !== 0) {
        const edgeX: number = player.x + (player.hsp > 0 ? 64 : 0);
        if (!place_meeting(edgeX, player.y + 120)
        && !place_meeting(edgeX, player.y + 20)) {
            player.x += player.hsp * delta;
        }
    }

    // 改变玩家腿部旋转方向
    if (player.state === playerState.swimming) {
        const kicking: boolean = player.left === 1 || player.right === 1 || player.jumpHeld;
        if (kicking || (player.leg_rad !== 0 && player.leg_rad < 2 * Math.PI)) {
            player.leg_rad += 0.4 * delta;
            if (player.leg_rad >= 2 * Math.PI){player.leg_rad = 0;}
        }
    } else if (player.left === 1 || player.right === 1) {
        player.leg_rad += (0.3 + player.acc / 48) * delta;
        if (player.leg_rad >= 2 * Math.PI){player.leg_rad = 0;}
    } else {
        if (player.leg_rad !== 0 && player.leg_rad < 2 * Math.PI) {
            player.leg_rad += 0.3 * delta;
            if (player.leg_rad >= 2 * Math.PI) {player.leg_rad = 0;}
        }
    }

    // 改变玩家手旋转方向
    if (player.needRotateHand) {
        if (player.rightOnMouse) {player.isRotateRighthand = true;}
        else {player.isRotateRighthand = false;}

        player.hand_rad += 0.3 * delta;
        if (player.hand_rad >= Math.PI) {
            player.needRotateHand = false;
            player.hand_rad = 0;
        }
    } else {
        player.hand_rad = 0;
    }
}

function playerJump(delta: number): void { // 玩家跳跃（水中为划水与水的阻力）
    if (isWaterAt(player.x + 32, player.y + 120)) {
        player.vsp += player.grav * waterGravRatio * delta;
        if (player.jumpHeld) {player.vsp -= swimThrust * delta;}
        player.vsp -= player.vsp * waterDrag * delta;

        if (player.jumpHeld && player.vsp < 0 && player.vsp > -minRiseVsp) {
            player.vsp = -minRiseVsp;
        }
    } else {
        player.vsp += player.grav * delta;
    }
    if (player.vsp != 0) {
        for (let i = 0; i < Math.abs(player.vsp); i++) {
            if (player.vsp > 0) {
                if (!(place_meeting(player.x+8, player.y+128) || place_meeting(player.x + 56, player.y + 128))) {
                    player.y++;
                } else {
                    const fallSpeed = player.vsp;
                    if (fallSpeed > 16) {
                        playerHurt(player, Math.floor((fallSpeed - 16) / 2)); // 计算摔落伤害
                    }

                    player.vsp = 0;
                    player.can_jump = true;
                    break;
                }
            } else {
                if (!place_meeting(player.x+32, player.y)) {
                    player.y--;
                } else {
                    player.vsp = 0;
                    break;
                }
            }
        }
    }
    if (!(place_meeting(player.x + 8, player.y + 128) || place_meeting(player.x + 56, player.y + 128))){
        player.can_jump = false;
    }
}

function main(): void {
    initPlayer(player, readingWorld);
    enableKeyDoubleClickDetection();
    registerPlayerInput();
}
main();

function playerLoop(delta: number): void {
    player.rightOnMouse = mouse.x > player.screen_x + player.width / 2;

    if (!uistate.invenUI_isOpening() && player.hp > 0) { // 打开背包无法移动
        playerMove(delta);
    }

    if (player.hp > 0) {playerJump(delta);}
}

export { player, playerLoop };