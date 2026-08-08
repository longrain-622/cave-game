import { getRandomInt, place_meeting, point_coll_rect, distance, isOnScreen } from '../const.js';
import { checkBlock } from '../rendering.js';
import { player } from '../player.js';
import { pickupObj, inventory, widgets } from '../gui/gameGUI/inventory.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { eventBus } from '../others/eventBus.js';
import { checkItem, idOfItem } from './items.js';
import { idOfBlock } from '../nature/blockMecha/blockMechanism.js';
import { ctx_entity } from '../animals/animalDraw.js';
import '../others/audioManager.js';
import { apioxEvent } from '../../apiox/event.js';

class Droppeds {
    type: number;
    x: number;
    y: number;
    vsp: number;    // 垂直速度
    hsp: number;    // 水平速度
    width: number;
    height: number;
    timer: number;  // 计时器，达到阈值后才允许拾取

    constructor(type: number, x: number, y: number) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;

        // 斜抛初速度：水平随机 -3 到 3，垂直向上 -5 到 -3
        this.hsp = getRandomInt(-3, 3);
        this.vsp = getRandomInt(-5, -3);

        this.timer = 0;   // 初始为0，开始计时
    }
}

let dropArray: Droppeds[] = [];
let look_range = 32; // 渲染范围 单位：格

function createDrop(type: number, x: number, y: number) {
    if (type !== -1) {
        const newDrop = new Droppeds(type, x, y);
        dropArray.push(newDrop);
    }

    // 删除超出渲染范围的掉落物
    for (let i = 0; i < dropArray.length; i++) {
        if (Math.abs(dropArray[i].x - player.x) >= look_range * 64 ||
            Math.abs(dropArray[i].y - player.y) >= look_range * 64) {
            dropArray.splice(i, 1);
        }
    }
}

function lookDrops(targetBlock: number): number { //返回对应方块掉落物的类型
    let dropObj: number = targetBlock;
    const isTakingPickaxe: boolean = (
        inventory.items[widgets.select].item === idOfItem.wooden_pickaxe ||
        inventory.items[widgets.select].item === idOfItem.stone_pickaxe ||
        inventory.items[widgets.select].item === idOfItem.iron_pickaxe
    );

    switch(targetBlock) {
        case idOfBlock.invicon_grass: case idOfBlock.glass: dropObj = idOfBlock.air; break;
        case idOfBlock.grass: case idOfBlock.snowGrass: dropObj = idOfBlock.dirt; break;
        case idOfBlock.stone: case idOfBlock.cobblestone:
            if (isTakingPickaxe) {dropObj = idOfBlock.cobblestone;}
            else {dropObj = idOfBlock.air;}
            break;
        case idOfBlock.leaves: if (getRandomInt(0, 1) === 0) {dropObj = idOfBlock.air;} else {dropObj = idOfItem.apple;} break;
        case idOfBlock.sandstone: if (!isTakingPickaxe) {dropObj = idOfBlock.air;} break;
        case idOfBlock.iron_ore: if (!isTakingPickaxe) {dropObj = idOfBlock.air;} else {dropObj = idOfItem.raw_iron;} break;
        case idOfBlock.coal_ore: if (!isTakingPickaxe) {dropObj = idOfBlock.air;} else {dropObj = idOfItem.coal;} break;
        case idOfBlock.deadBush: if (getRandomInt(0, 2) === 0) {dropObj = idOfItem.stick;} else {dropObj = idOfBlock.air;} break;
        case idOfBlock.oak_door_bottom: case idOfBlock.oak_door_top: case idOfBlock.oak_door_bottom_open: case idOfBlock.oak_door_top_open: dropObj = idOfItem.oak_door; break;
    }
    return dropObj;
}

function drawDrops() {
    for (let k = 0; k < dropArray.length; k++) {
        const drop: Droppeds = dropArray[k];
        const screenX: number = player.screen_x + drop.x - player.x;
        const screenY: number = player.screen_y + drop.y - player.y;
        if (!isOnScreen(screenX, screenY, drop.width, drop.height)) {continue;}
        checkBlock(ctx_entity, drop.type, screenX, screenY, drop.width, drop.height);
        checkItem(ctx_entity, drop.type, screenX, screenY, drop.width, drop.height);
    }
}

// 普通物理运动（重力、水平阻力、碰撞）
function applyNormalPhysics(drop: Droppeds) {
    const GRAVITY: number = 0.5;
    drop.vsp += GRAVITY; //应用重力

    // 垂直移动（逐像素碰撞）
    if (drop.vsp !== 0) {
        const step = Math.abs(drop.vsp);
        for (let a = 0; a < step; a++) {
            const sign: number = drop.vsp > 0 ? 1 : -1;
            const nextY: number = drop.y + sign;
            if (!place_meeting(drop.x + drop.width, nextY + (sign > 0 ? drop.height : 0))) {
                drop.y = nextY;
            } else {
                drop.vsp = 0;
                if (sign > 0) drop.hsp = 0;  // 落地时停止水平移动
                break;
            }
        }
    }

    // 水平移动（仅当尚未落地时，即仍有水平速度）
    if (drop.hsp !== 0) {
        const step: number = Math.abs(drop.hsp);
        for (let a = 0; a < step; a++) {
            const sign: number = drop.hsp > 0 ? 1 : -1;
            const nextX: number = drop.x + sign;
            if (!place_meeting(nextX + drop.width, drop.y + drop.height)) {
                drop.x = nextX;
            } else {
                drop.hsp = 0;
                break;
            }
        }
    }
}

function dropsX() {
    const MAGNET_DIST: number = 200;      // 触发吸引的距离（像素）
    const PICKUP_DELAY_FRAMES: number = 64; // 延迟帧数，期间不可吸引和拾取
    let MAGNET_SPEED: number = 4;       // 吸引速度（每帧移动像素数）

    for (let i = 0; i < dropArray.length; i++) {
        const drop: Droppeds = dropArray[i];
        drop.timer++;  // 每帧增加计时

        // 延迟未结束：只进行普通物理运动，不吸引也不拾取
        if (drop.timer < PICKUP_DELAY_FRAMES) {
            applyNormalPhysics(drop);
            continue;
        }

        //延迟已过，可被吸引和拾取
        MAGNET_SPEED = 4 + 1024/distance(drop.x, drop.y, player.x, player.y);
        const dropCenterX: number = drop.x + drop.width / 2;
        const dropCenterY: number = drop.y + drop.height / 2;
        const playerCenterX: number = player.x + player.width / 2;
        const playerCenterY: number = player.y + player.height / 2;

        const dx: number = playerCenterX - dropCenterX;
        const dy: number = playerCenterY - dropCenterY;
        const distSq: number = dx * dx + dy * dy;

        // 玩家接近时主动靠近（磁吸）
        if (distSq < MAGNET_DIST * MAGNET_DIST) {
            // 计算移动方向（归一化后乘以磁吸速度）
            let len: number = Math.sqrt(distSq);
            if (len < 0.01) {len = 1;}
            let moveX: number = (dx / len) * MAGNET_SPEED;
            let moveY: number = (dy / len) * MAGNET_SPEED;

            //水平移动
            let stepX: number = Math.abs(moveX);
            for (let a = 0; a < stepX; a++) {
                const sign: number = moveX > 0 ? 1 : -1;
                const nextX: number = drop.x + sign;
                if (!place_meeting(nextX + drop.width, drop.y + drop.height)) {
                    drop.x = nextX;
                } else {
                    moveX = 0;
                    break;
                }
            }

            //垂直移动
            let stepY: number = Math.abs(moveY);
            for (let a = 0; a < stepY; a++) {
                const sign: number = moveY > 0 ? 1 : -1;
                const nextY: number = drop.y + sign;
                if (!place_meeting(drop.x + drop.width, nextY + (sign > 0 ? drop.height : 0))) {
                    drop.y = nextY;
                } else {
                    moveY = 0;
                    break;
                }
            }

            // 如果掉落物与玩家矩形重叠则拾取
            if (point_coll_rect(drop.x, drop.y, player.x, player.y, player.width, player.height) ||
                point_coll_rect(drop.x + drop.width, drop.y, player.x, player.y, player.width, player.height) ||
                point_coll_rect(drop.x, drop.y + drop.height, player.x, player.y, player.width, player.height) ||
                point_coll_rect(drop.x + drop.width, drop.y + drop.height, player.x, player.y, player.width, player.height)
            ) {
                pickupObj(drop.type);
                dropArray.splice(i, 1);
                i--; // 调整索引，因为数组长度改变
                eventBus.emit('item:pickup');
                continue;
            }

            // 清除原有的速度，避免脱离吸引后乱飞
            drop.hsp = 0;
            drop.vsp = 0;
        } 
        else { //未接近时：普通物理运动
            applyNormalPhysics(drop);
        }
    }
}

apioxEvent.onKeyDown((e) => { //丢弃物品
    if (e.key !== 'q') {return;}
    if (inventory.items[widgets.select].num >= 1) {
        inventory.items[widgets.select].num -= 1;
        createDrop(inventory.items[widgets.select].item, player.x + player.width/2 + player.face*32, player.y);
        if (inventory.items[widgets.select].num <= 0) {
            inventory.items[widgets.select] = new Slots(-1, 0);
        }
    }
});

function dropLoop() {
    drawDrops();
    dropsX();
}

export { createDrop, dropLoop, dropArray, lookDrops };