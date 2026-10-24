import * as PIXI from 'pixi.js';

import { player } from '../player.js';
import { isOnScreen } from '../const.js';
import { app, blockTextures, isDrawing } from './rendering.js';
import { applyLightTint } from './light.js';
import { eventBus } from '../others/eventBus.js';
import { entityBlock_array, EntityBlock } from '../nature/entityBlock.js';

const entityBlockLayer: PIXI.Container = new PIXI.Container(); // 实体方块渲染层
const entityBlockSpriteMap: Map<EntityBlock, PIXI.Sprite> = new Map(); // 每个实体方块对应的渲染 Sprite（移除时同步销毁）
let can_drawEntityBlock: boolean = false; // 纹理未就绪时等待

function markTexturesReady(): void {
    can_drawEntityBlock = true;
}

function main(): void {
    app.stage.addChild(entityBlockLayer);
    entityBlockLayer.zIndex = 3.65;

    // 本模块可能晚于 textures:ready 事件求值，因此先检查一次当前状态
    if (isDrawing) {markTexturesReady();}
    else {eventBus.once('textures:ready', markTexturesReady);}
}
main();

// 绘制单个实体方块
function drawEntityBlock(entityBlock: EntityBlock): void {
    const draw_x: number = player.screen_x + entityBlock.x - player.x;
    const draw_y: number = player.screen_y + entityBlock.y - player.y;

    let sprite: PIXI.Sprite | undefined = entityBlockSpriteMap.get(entityBlock);
    if (!sprite) {
        sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        entityBlockLayer.addChild(sprite);
        entityBlockSpriteMap.set(entityBlock, sprite);
    }

    if (!isOnScreen(draw_x, draw_y, 64, 64)) {
        sprite.visible = false;
        return;
    }

    const texture: PIXI.Texture | undefined = blockTextures[entityBlock.id];
    if (!texture) {
        sprite.visible = false; // 无对应贴图（如空气），不绘制
        return;
    }

    // 纹理与尺寸在实体方块生命周期内不变，仅在首次（或纹理变化时）赋值
    if (sprite.texture !== texture) {
        sprite.texture = texture;
        sprite.width = 64;
        sprite.height = 64;
    }
    sprite.position.set(draw_x, draw_y);
    applyLightTint(sprite, entityBlock.x + 32, entityBlock.y + 32);
    sprite.visible = true;
}

export function renderingEntityBlock(): void {
    if (!can_drawEntityBlock) {
        if (!isDrawing) {return;}
        can_drawEntityBlock = true; // 兜底：即使错过 textures:ready 事件，纹理就绪后也能开始绘制
    }

    const aliveEntityBlocks: Set<EntityBlock> = new Set(entityBlock_array);
    for (const [entityBlock, sprite] of entityBlockSpriteMap) {
        // 兜底清理已移除实体方块的渲染 Sprite
        if (aliveEntityBlocks.has(entityBlock)) {continue;}
        entityBlockLayer.removeChild(sprite);
        sprite.destroy();
        entityBlockSpriteMap.delete(entityBlock);
    }

    for (let i = 0; i < entityBlock_array.length; i++) {
        const looking: EntityBlock = entityBlock_array[i];
        if (can_drawEntityBlock) {drawEntityBlock(looking);} // 纹理未就绪时跳过绘制，物理照常
    }
}
