import * as PIXI from 'pixi.js';

import { player } from '../../player.js';
import { isOnScreen } from '../../const.js';
import { app, blockTextures, isDrawing } from '../rendering.js';
import { applyLightTint } from '../light.js';
import { itemTextures } from './itemTextures.js';
import { eventBus } from '../../others/eventBus.js';
import { dropArray, Droppeds } from '../../dropped/droppedItem.js';

const dropLayer: PIXI.Container = new PIXI.Container(); // 掉落物渲染层
const dropSpriteMap: Map<Droppeds, PIXI.Sprite> = new Map(); // 每个掉落物对应的渲染 Sprite（掉落物移除时同步销毁）
let can_drawDrop: boolean = false; // 纹理未就绪时等待

function markTexturesReady(): void {
    can_drawDrop = true;
}

function main(): void {
    app.stage.addChild(dropLayer);
    dropLayer.zIndex = 3.55;

    // 本模块可能晚于 textures:ready 事件求值，因此先检查一次当前状态
    if (isDrawing) {markTexturesReady();}
    else {eventBus.once('textures:ready', markTexturesReady);}
}
main();

export function drawDrops(): void {
    if (!can_drawDrop) {
        if (!isDrawing) {return;}
        can_drawDrop = true; // 兜底：即使错过 textures:ready 事件，纹理就绪后也能开始绘制
    }

    // 兜底清理已移除掉落物的渲染 Sprite
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

        let sprite: PIXI.Sprite | undefined = dropSpriteMap.get(drop);
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
