//rendering.ts
import { isOutOfBounds, getBlockState, world, BlockState } from '../world.js';
import { room } from '../../constants/generic.js';
import { player } from '../player.js';
import { initSkyBackground, initSkyContainer } from './world/skyRender.js';
import { mouse } from '../input/mouseInput.js';
import { idOfBlock, canBehind } from '../nature/blockMecha/blocks.js';
import { eventBus } from '../others/eventBus.js';
import { applyLightTint, applyBackgroundLightTint } from './light.js';
import { drawWaterSprite } from './blockFrames.js';
import { itemTextureUrl_16 } from './items/itemTextures.js';

import * as PIXI from 'pixi.js';
import { apiMethod } from '../../apiox/method.js';
import { apioxTime } from '../../apiox/time.js';

const blockTextureUrl_16: string = '/assets/images/games/blocks/blocks_16.png';
const blockTextureUrl_32: string = '/assets/images/games/blocks/blocks_32.png';
const destroyFrameUrl: string = '/assets/images/games/blocks/destory/destory_strip10.png';
const ITEM_ATLAS_16_TORCH: number = 15;

const BLOCK_ATLAS_16: Record<string, number> = {
    coal_ore: 0,
    iron_ore: 1,
    oak_door_bottom: 2,
    oak_door_top: 3,
    stone_dark: 4,
    andesite: 5,
    bedrock: 6,
    cactus: 7,
    cobblestone: 8,
    crafting_table: 9,
    deadBush: 10,
    diorite: 11,
    dirt: 12,
    furnace: 13,
    furnace_burning: 14,
    glass: 15,
    granite: 16,
    grass: 17,
    snowGrass: 18,
    torch_turn: 19,
    leaves: 20,
    oak: 21,
    oak_door_bottom_open: 22,
    oak_door_top_open: 23,
    planks: 24,
    sand: 25,
    sandstone: 26,
    stone: 27,
    chest: 28,
};

export let isDrawing: boolean = false;
export let renderFPS: number = 0;
export const blockTextures: Record<number | string, PIXI.Texture> = {};

export let app: PIXI.Application;
export let gameRoom: Element | null;
let worldContainer: PIXI.Container;
let tileSprites: PIXI.Sprite[] = [];
let cursorSprite: PIXI.Graphics;
let destroySprite: PIXI.Sprite;
let destroyFrames: PIXI.Texture[] = [];
let bgContainer: PIXI.Container;
let bgSprites: PIXI.Sprite[] = [];

function sliceAtlas(
    baseTexture: PIXI.BaseTexture,
    index: number,
    frameSize: number
): PIXI.Texture { // 从图集基纹理按索引裁剪
    const cols: number = Math.floor(baseTexture.width / frameSize);
    const x: number = (index % cols) * frameSize;
    const y: number = Math.floor(index / cols) * frameSize;
    return new PIXI.Texture(baseTexture, new PIXI.Rectangle(x, y, frameSize, frameSize));
}

function initApp(): void {
    //@ts-ignore - defaultOptions
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    app = new PIXI.Application({
        width: room.width,
        height: room.height,
        antialias: false,
        backgroundAlpha: 0,
    });
    app.ticker.maxFPS = 120;
    fpsWindowStart = apioxTime.now();
    app.ticker.add(updateRenderFPS);
    const viewStyle: CSSStyleDeclaration = (app.view as HTMLCanvasElement).style;
    viewStyle.position = 'absolute';
    viewStyle.left = '0';
    viewStyle.top = '0';
    viewStyle.width = room.width + 'px';
    viewStyle.height = room.height + 'px';
    app.stage.sortableChildren = true;

    initSkyContainer(app.stage); // 天空图层

    gameRoom = apiMethod.select('.GameRoom');
    if (gameRoom) {
        gameRoom.appendChild(app.view as HTMLCanvasElement);
    }
}

let fpsFrameCount: number = 0;
let fpsWindowStart: number = 0;

function updateRenderFPS(): void { // 统计每秒真正画出的帧数
    fpsFrameCount++;
    const elapsedMS: number = apioxTime.now() - fpsWindowStart;
    if (elapsedMS >= 1000) {
        renderFPS = Math.round(fpsFrameCount * 1000 / elapsedMS);
        fpsFrameCount = 0;
        fpsWindowStart = apioxTime.now();
    }
}

function initWorldLayer(): void {
    worldContainer = new PIXI.Container();
    bgContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);
    app.stage.addChild(bgContainer);
    worldContainer.zIndex = 1;
    bgContainer.zIndex = 0;

    const maxTilesX: number = Math.ceil(room.width / 64) + 2;
    const maxTilesY: number = Math.ceil(room.height / 64) + 2;
    const maxVisibleTiles: number = maxTilesX * maxTilesY; // 预估最大可见方块数

    for (let i: number = 0; i < maxVisibleTiles; i++) { // Sprite 池
        const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 64;
        sprite.height = 64;
        sprite.visible = false;
        worldContainer.addChild(sprite);
        tileSprites.push(sprite);
    }

    for (let k: number = 0; k < maxVisibleTiles; k++) {
        const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 64;
        sprite.height = 64;
        sprite.visible = false;
        bgContainer.addChild(sprite);
        bgSprites.push(sprite);
    }
}

function initBlockTextures(textures: Record<string, PIXI.Texture>): void {
    const block16Base: PIXI.BaseTexture = textures[blockTextureUrl_16].baseTexture;
    const block32Base: PIXI.BaseTexture = textures[blockTextureUrl_32].baseTexture;
    const item16Base: PIXI.BaseTexture = textures[itemTextureUrl_16].baseTexture;

    blockTextures[idOfBlock.coal_ore] = sliceAtlas(block16Base, BLOCK_ATLAS_16.coal_ore, 16);
    blockTextures[idOfBlock.iron_ore] = sliceAtlas(block16Base, BLOCK_ATLAS_16.iron_ore, 16);
    blockTextures[idOfBlock.oak_door_bottom] = sliceAtlas(block16Base, BLOCK_ATLAS_16.oak_door_bottom, 16);
    blockTextures[idOfBlock.oak_door_top] = sliceAtlas(block16Base, BLOCK_ATLAS_16.oak_door_top, 16);
    blockTextures[idOfBlock.stone_dark] = sliceAtlas(block16Base, BLOCK_ATLAS_16.stone_dark, 16);
    blockTextures[idOfBlock.andesite] = sliceAtlas(block16Base, BLOCK_ATLAS_16.andesite, 16);
    blockTextures[idOfBlock.bedrock] = sliceAtlas(block16Base, BLOCK_ATLAS_16.bedrock, 16);
    blockTextures[idOfBlock.cactus] = sliceAtlas(block16Base, BLOCK_ATLAS_16.cactus, 16);
    blockTextures[idOfBlock.cobblestone] = sliceAtlas(block16Base, BLOCK_ATLAS_16.cobblestone, 16);
    blockTextures[idOfBlock.crafting_table] = sliceAtlas(block16Base, BLOCK_ATLAS_16.crafting_table, 16);
    blockTextures[idOfBlock.deadBush] = sliceAtlas(block16Base, BLOCK_ATLAS_16.deadBush, 16);
    blockTextures[idOfBlock.diorite] = sliceAtlas(block16Base, BLOCK_ATLAS_16.diorite, 16);
    blockTextures[idOfBlock.dirt] = sliceAtlas(block16Base, BLOCK_ATLAS_16.dirt, 16);
    blockTextures[idOfBlock.furnace] = sliceAtlas(block16Base, BLOCK_ATLAS_16.furnace, 16);
    blockTextures[idOfBlock.glass] = sliceAtlas(block16Base, BLOCK_ATLAS_16.glass, 16);
    blockTextures[idOfBlock.granite] = sliceAtlas(block16Base, BLOCK_ATLAS_16.granite, 16);
    blockTextures[idOfBlock.grass] = sliceAtlas(block16Base, BLOCK_ATLAS_16.grass, 16);
    blockTextures[idOfBlock.snowGrass] = sliceAtlas(block16Base, BLOCK_ATLAS_16.snowGrass, 16);
    blockTextures['torch_turn'] = sliceAtlas(block16Base, BLOCK_ATLAS_16.torch_turn, 16);
    blockTextures[idOfBlock.leaves] = sliceAtlas(block16Base, BLOCK_ATLAS_16.leaves, 16);
    blockTextures[idOfBlock.oak] = sliceAtlas(block16Base, BLOCK_ATLAS_16.oak, 16);
    blockTextures[idOfBlock.oak_door_bottom_open] = sliceAtlas(block16Base, BLOCK_ATLAS_16.oak_door_bottom_open, 16);
    blockTextures[idOfBlock.oak_door_top_open] = sliceAtlas(block16Base, BLOCK_ATLAS_16.oak_door_top_open, 16);
    blockTextures[idOfBlock.planks] = sliceAtlas(block16Base, BLOCK_ATLAS_16.planks, 16);
    blockTextures[idOfBlock.sand] = sliceAtlas(block16Base, BLOCK_ATLAS_16.sand, 16);
    blockTextures[idOfBlock.sandstone] = sliceAtlas(block16Base, BLOCK_ATLAS_16.sandstone, 16);
    blockTextures[idOfBlock.stone] = sliceAtlas(block16Base, BLOCK_ATLAS_16.stone, 16);
    blockTextures[idOfBlock.chest] = sliceAtlas(block16Base, BLOCK_ATLAS_16.chest, 16);
    blockTextures[idOfBlock.invicon_grass] = sliceAtlas(block32Base, 0, 32);
    blockTextures[idOfBlock.torch] = sliceAtlas(item16Base, ITEM_ATLAS_16_TORCH, 16);
    blockTextures['destory'] = textures[destroyFrameUrl];
}

export function genericTextStyle(fontSize: number=24): PIXI.TextStyle {
    return new PIXI.TextStyle({
        fontFamily: 'Unifont', // 这里的名字必须与字体文件内部定义的名称一致
        fontSize: fontSize,
        fill: '#ffffff',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowAlpha: 0.8,
        dropShadowBlur: 0,
        dropShadowDistance: 2,
        dropShadowAngle: Math.PI / 4,
        padding: 10,
    });
}

function main(): void {
    initApp();
    initWorldLayer();

    PIXI.Assets.load<Record<string, PIXI.Texture>>([
        blockTextureUrl_16,
        blockTextureUrl_32,
        itemTextureUrl_16,
        destroyFrameUrl,
    ]).then((textures: Record<string, PIXI.Texture>) => { // 加载方块贴图
        initBlockTextures(textures);
        isDrawing = true;

        initSkyBackground();
        eventBus.emit('textures:ready'); // 通知依赖 blockTextures 的模块可以安全创建纹理了

        const mouseUIContainer = new PIXI.Container(); // 鼠标 UI 容器
        app.stage.addChild(mouseUIContainer);
        mouseUIContainer.zIndex = 2;

        cursorSprite = new PIXI.Graphics(); // 鼠标光标
        cursorSprite.lineStyle(1, 0x000000, 0.7); // 黑色边框，宽度1
        cursorSprite.drawRect(0, 0, 64, 64); // 64x64空心矩形
        cursorSprite.visible = false;
        mouseUIContainer.addChild(cursorSprite);

        const destroyBaseTex = (blockTextures['destory'] as PIXI.Texture).baseTexture; // 破坏动画
        destroyFrames = [];
        for (let i = 0; i < 10; i++) {
            const frame = new PIXI.Rectangle(i * 16, 0, 16, 16);
            destroyFrames.push(new PIXI.Texture(destroyBaseTex, frame));
        }
        destroySprite = new PIXI.Sprite(destroyFrames[0]);
        destroySprite.width = 64;
        destroySprite.height = 64;
        destroySprite.visible = false;
        destroySprite.alpha = 0.6;
        mouseUIContainer.addChild(destroySprite);
    }).catch((error: unknown) => {
        console.error('load block textures error', error);
    });
}
main();

// Draw torch
function drawTorchSprite(sprite: PIXI.Sprite, state: BlockState, draw_x: number, draw_y: number, worldCol: number, worldRow: number): boolean {
    if (state.type !== idOfBlock.torch) {return false;}

    const texture: PIXI.Texture = state.direction === 2 ? blockTextures[idOfBlock.torch] : blockTextures['torch_turn'];
    if (!texture) {
        sprite.visible = false;
        return true;
    }

    // direction 0 与 1 左右对称：镜像用 x 轴负缩放实现，位置右移一格让贴图仍落在该格内
    const flip: boolean = state.direction === 0;
    sprite.texture = texture;
    sprite.scale.x = flip ? -Math.abs(sprite.scale.x) : Math.abs(sprite.scale.x);
    sprite.position.set(flip ? draw_x + 64 : draw_x, draw_y);
    applyLightTint(sprite, worldCol * 64, worldRow * 64);
    sprite.visible = true;
    return true;
}

export function updateWorldPixi(): void {
    if (!isDrawing) {return;}

    const startRow: number = Math.floor(player.y / 64) - Math.floor(room.height / 128);
    const startCol: number = Math.floor(player.x / 64) - Math.floor(room.width / 128);
    const rowsToDraw: number = Math.ceil(room.height / 64) + 2;
    const colsToDraw: number = Math.ceil(room.width / 64) + 2;

    let index: number = 0; // 池索引

    for (let k = 0; k < rowsToDraw; k++) {
        const worldRow: number = startRow + k;
        const row: number[] = world[worldRow]; // 行越界时为空值，由 isOutOfBounds 拦截
        const draw_y: number = worldRow * 64 - player.y + player.screen_y;

        for (let i = 0; i < colsToDraw; i++) {
            const worldCol: number = startCol + i;
            const sprite: PIXI.Sprite = tileSprites[index];
            if (!sprite) {break;}
            const bgSprite: PIXI.Sprite = bgSprites[index];

            // 越界时，仍需消耗池中的 sprite（两层都设为不可见）
            if (isOutOfBounds(worldRow, worldCol)) {
                sprite.visible = false;
                bgSprite.visible = false;
                index++;
                continue;
            }

            const draw_x: number = worldCol * 64 - player.x + player.screen_x;
            const state: BlockState = getBlockState(row[worldCol]);

            if (!drawTorchSprite(sprite, state, draw_x, draw_y, worldCol, worldRow)
                && !drawWaterSprite(sprite, state, draw_x, draw_y, worldCol, worldRow)) {
                const texture: PIXI.Texture = blockTextures[state.type];
                if (texture) {
                    sprite.texture = texture;
                    sprite.scale.x = Math.abs(sprite.scale.x); // 清掉火把镜像留下的负缩放
                    sprite.position.set(draw_x, draw_y);
                    applyLightTint(sprite, worldCol * 64, worldRow * 64);
                    sprite.visible = true;
                } else {
                    sprite.visible = false;
                }
            }

            // 背景层深色石用石头贴图
            if (state.behind !== idOfBlock.air && canBehind(state.behind)) {
                const bgTexture: PIXI.Texture = blockTextures[state.behind === idOfBlock.stone_dark ? idOfBlock.stone : state.behind];
                if (bgTexture) {
                    bgSprite.texture = bgTexture;
                    bgSprite.position.set(draw_x, draw_y);
                    applyBackgroundLightTint(bgSprite, worldCol * 64, worldRow * 64);
                    bgSprite.visible = true;
                } else {
                    bgSprite.visible = false;
                }
            } else {
                bgSprite.visible = false;
            }

            index++;
        }
    }

    // 隐藏池中剩余的 sprite（实际不会超出 maxVisibleTiles，但为了安全）
    for (let i: number = index; i < tileSprites.length; i++) {
        tileSprites[i].visible = false;
        bgSprites[i].visible = false;
    }
}

export function updateMouseSprites(): void {
    if (!cursorSprite || !destroySprite) {return;}

    if (!mouse.can_use) {
        cursorSprite.visible = false;
        destroySprite.visible = false;
        return;
    }

    // 计算屏幕坐标 每格64px
    const screenX: number = player.screen_x + mouse.world_x * 64 - player.x;
    const screenY: number = player.screen_y + mouse.world_y * 64 - player.y;

    // 光标
    cursorSprite.position.set(screenX, screenY);
    cursorSprite.visible = true;

    // 破坏动画
    if (mouse.destory > 0 && mouse.destory < 10) {
        destroySprite.texture = destroyFrames[mouse.destory];
        destroySprite.position.set(screenX, screenY);
        destroySprite.visible = true;
    } else {
        destroySprite.visible = false;
    }
}
