import { place_meeting } from '../world.js';
import { getRandomInt, point_coll_rect, distance, isOnScreen } from '../const.js';
import { app, blockTextures } from '../rendering/rendering.js';
import { player } from '../player.js';
import { applyLightTint } from '../rendering/light.js';
import { pickupObj, inventory, widgets } from '../gui/gameGUI/inventory.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { eventBus } from '../others/eventBus.js';
import { idOfItem, itemTextures } from './items.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import '../others/audioManager.js';
import { apioxEvent } from '../../apiox/event.js';
import * as PIXI from 'pixi.js';

interface Droppeds {
    type: number;
    x: number;
    y: number;
    vsp: number;    // 垂直速度
    hsp: number;    // 水平速度
    width: number;
    height: number;
    timer: number;  // 计时器，达到阈值后才允许拾取
}

function newDroppeds(type: number, x: number, y: number): Droppeds {
    return {
        type: type,
        x: x, y: y,
        width: 32, height: 32,
        vsp: getRandomInt(-5, -3),
        hsp: getRandomInt(-3, 3),
        timer: 0,
    };
}

let dropArray: Droppeds[] = [];
let look_range = 32; // 渲染范围 单位：格

const dropLayer: PIXI.Container = new PIXI.Container(); // 掉落物渲染层
const dropSpriteMap: Map<Droppeds, PIXI.Sprite> = new Map(); // 每个掉落物对应的渲染 Sprite（掉落物移除时同步销毁）
let can_drawDrop: boolean = false; // 纹理未就绪时等待

function main(): void {
    app.stage.addChild(dropLayer);
    dropLayer.zIndex = 3.55;

    // 纹理就绪前不绘制
    eventBus.once('textures:ready', () => { can_drawDrop = true; });
}
main();

// 移除掉落物时同步销毁其渲染 Sprite
function removeDropSprite(drop: Droppeds): void {
    const sprite: PIXI.Sprite = dropSpriteMap.get(drop);
    if (sprite) {
        dropLayer.removeChild(sprite);
        sprite.destroy();
        dropSpriteMap.delete(drop);
    }
}

function createDrop(type: number, x: number, y: number) {
    if (type !== -1) {
        const newDrop = newDroppeds(type, x, y);
        dropArray.push(newDrop);
    }

    // 删除超出渲染范围的掉落物
    for (let i = 0; i < dropArray.length; i++) {
        if (Math.abs(dropArray[i].x - player.x) >= look_range * 64 ||
            Math.abs(dropArray[i].y - player.y) >= look_range * 64) {
            removeDropSprite(dropArray[i]);
            dropArray.splice(i, 1);
            i--; // 调整索引，避免跳过下一个掉落物
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

    switch (targetBlock) {
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

function drawDrops(): void {
    if (!can_drawDrop) {return;}

    // 兜底清理已移除掉落物的渲染 Sprite（正常情况下在移除处已同步销毁）
    const aliveDrops: Set<Droppeds> = new Set(dropArray);
    for (const [drop, sprite] of dropSpriteMap) {
        if (aliveDrops.has(drop)) {continue;}
        dropLayer.removeChild(sprite);
        sprite.destroy();
        dropSpriteMap.delete(drop);
    }

    for (let k = 0; k < dropArray.length; k++) {
        const drop: Droppeds = dropArray[k];
        const screenX: number = player.screen_x + drop.x - player.x;
        const screenY: number = player.screen_y + drop.y - player.y;

        let sprite: PIXI.Sprite = dropSpriteMap.get(drop);
        if (!sprite) {
            sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            dropLayer.addChild(sprite);
            dropSpriteMap.set(drop, sprite);
        }

        if (!isOnScreen(screenX, screenY, drop.width, drop.height)) {
            sprite.visible = false;
            continue;
        }

        // 方块掉落物用方块贴图，物品掉落物用物品贴图（两者 ID 不冲突）
        const texture: PIXI.Texture = blockTextures[drop.type] || itemTextures[drop.type];
        if (!texture) {
            sprite.visible = false; // 无对应贴图（如空气），不绘制
            continue;
        }

        // 纹理与尺寸在掉落物生命周期内不变，仅在首次（或纹理变化时）赋值
        if (sprite.texture !== texture) {
            sprite.texture = texture;
            sprite.width = drop.width;
            sprite.height = drop.height;
        }
        sprite.position.set(screenX, screenY);
        applyLightTint(sprite, drop.x + drop.width / 2, drop.y + drop.height / 2);
        sprite.visible = true;
    }
}

// 普通物理运动（重力、水平阻力、碰撞）
function applyNormalPhysics(drop: Droppeds, delta: number) {
    const GRAVITY: number = 0.5;
    drop.vsp += GRAVITY * delta; //应用重力

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

function dropsX(delta: number) {
    const MAGNET_DIST: number = 200; // 触发吸引的距离（像素）
    const PICKUP_DELAY_FRAMES: number = 64; // 延迟帧数，期间不可吸引和拾取
    let MAGNET_SPEED: number = 4; // 吸引速度（每帧移动像素数）

    for (let i = 0; i < dropArray.length; i++) {
        const drop: Droppeds = dropArray[i];
        drop.timer += delta;  // 每帧增加计时

        // 延迟未结束：只进行普通物理运动，不吸引也不拾取
        if (drop.timer < PICKUP_DELAY_FRAMES) {
            applyNormalPhysics(drop, delta);
            continue;
        }

        // 延迟已过，可被吸引和拾取
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
            let moveX: number = (dx / len) * MAGNET_SPEED * delta;
            let moveY: number = (dy / len) * MAGNET_SPEED * delta;

            // 水平移动
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

            // 垂直移动
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
                removeDropSprite(drop);
                dropArray.splice(i, 1);
                i--; // 调整索引，因为数组长度改变
                eventBus.emit('item:pickup');
                continue;
            }

            // 清除原有的速度，避免脱离吸引后乱飞
            drop.hsp = 0;
            drop.vsp = 0;
        } else { // 未接近时：普通物理运动
            applyNormalPhysics(drop, delta);
        }
    }
}

apioxEvent.onKeyDown((e) => { // 丢弃物品
    if (e.key !== 'q') {return;}
    if (inventory.items[widgets.select].num >= 1) {
        inventory.items[widgets.select].num -= 1;
        createDrop(inventory.items[widgets.select].item, player.x + player.width/2 + player.face*32, player.y);
        if (inventory.items[widgets.select].num <= 0) {
            inventory.items[widgets.select] = new Slots(-1, 0);
        }
    }
});

function dropLoop(delta: number) {
    drawDrops();
    dropsX(delta);
}

export { createDrop, dropLoop, dropArray, lookDrops };