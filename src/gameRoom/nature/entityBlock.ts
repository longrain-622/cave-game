import { app, blockTextures } from "../rendering.js";
import { player } from "../player.js";
import { place_meeting, setWorldState } from "../world.js";
import { coverWhenSave, readingWorld } from "../gameState.js";
import { idOfBlock } from "./blockMecha/blocks.js";
import { eventBus } from "../others/eventBus.js";
import { isOnScreen } from "../const.js";
import * as PIXI from 'pixi.js';

interface EntityBlock {
    id: number;
    world_x: number; world_y: number;
    x: number; y: number; // px
    vsp: number;
    timer: number;
}

function newEntityBlock(id: number, world_x: number, world_y: number): EntityBlock {
    return {
        id: id,
        world_x: world_x, world_y: world_y,
        x: world_x * 64, y: world_y * 64,
        vsp: 0,
        timer: 0,
    };
}

let entityBlock_array: EntityBlock[] = [];

const entityBlockLayer: PIXI.Container = new PIXI.Container(); // 实体方块渲染层
const entityBlockSpriteMap: Map<EntityBlock, PIXI.Sprite> = new Map(); // 每个实体方块对应的渲染 Sprite（移除时同步销毁）
let can_drawEntityBlock: boolean = false; // 纹理未就绪时等待

function main(): void {
    app.stage.addChild(entityBlockLayer);
    entityBlockLayer.zIndex = 3.65;

    // 纹理就绪前不绘制
    eventBus.once('textures:ready', () => { can_drawEntityBlock = true; });

    // 初始化实体方块数组（读档）
    if (coverWhenSave && readingWorld !== null) {
        for (let i = 0; i < readingWorld.entityBlocks.length; i++) {
            const readEntityBlock = readingWorld.entityBlocks[i];
            const putEntityBlock = newEntityBlock(readEntityBlock.id, readEntityBlock.world_x, readEntityBlock.world_y);
            putEntityBlock.vsp = readEntityBlock.vsp;
            putEntityBlock.timer = readEntityBlock.timer;
            entityBlock_array.push(putEntityBlock);
        }
    }
}
main();

// 移除实体方块时同步销毁其渲染 Sprite
function removeEntityBlockSprite(entityBlock: EntityBlock): void {
    const sprite: PIXI.Sprite = entityBlockSpriteMap.get(entityBlock);
    if (sprite) {
        entityBlockLayer.removeChild(sprite);
        sprite.destroy();
        entityBlockSpriteMap.delete(entityBlock);
    }
}

function sand_fall(obj: EntityBlock, i: number): number {
    obj.vsp++;
    obj.y += obj.vsp;

    if (place_meeting(obj.x + 32, obj.y + 64)) {
        setWorldState({ x: Math.floor(obj.x / 64), y: Math.floor(obj.y / 64) }, { type: idOfBlock.sand });

        removeEntityBlockSprite(obj);
        entityBlock_array.splice(i, 1);
        return i - 1;
    }

    obj.timer++; //掉落的沙子到了时间就清除
    if (obj.timer >= 1024) {
        removeEntityBlockSprite(obj);
        entityBlock_array.splice(i, 1);
        return i - 1;
    }

    return i; // 未移除时返回原索引，避免循环提前终止
}

// 绘制单个实体方块
function drawEntityBlock(entityBlock: EntityBlock): void {
    const draw_x: number = player.screen_x + entityBlock.x - player.x;
    const draw_y: number = player.screen_y + entityBlock.y - player.y;

    let sprite: PIXI.Sprite = entityBlockSpriteMap.get(entityBlock);
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
    sprite.visible = true;
}

function look_entityBlock(): void {
    // 兜底清理已移除实体方块的渲染 Sprite（正常情况在移除处已同步销毁）
    const aliveEntityBlocks: Set<EntityBlock> = new Set(entityBlock_array);
    for (const [entityBlock, sprite] of entityBlockSpriteMap) {
        if (aliveEntityBlocks.has(entityBlock)) {continue;}
        entityBlockLayer.removeChild(sprite);
        sprite.destroy();
        entityBlockSpriteMap.delete(entityBlock);
    }

    for (let i = 0; i < entityBlock_array.length; i++) {
        const looking: EntityBlock = entityBlock_array[i];

        // 绘制实体方块（纹理未就绪时跳过绘制，物理照常）
        if (can_drawEntityBlock) {drawEntityBlock(looking);}

        switch (looking.id) {
            case idOfBlock.sand: i = sand_fall(looking, i); break;
        }
    }
}

export { entityBlock_array, EntityBlock, look_entityBlock, newEntityBlock };
