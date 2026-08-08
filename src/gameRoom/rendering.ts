//rendering.ts
import { isOutOfBounds, world } from "./const.js";
import { room } from "../constants/generic.js";
import { player } from "./player.js";
import { initSkyBackground, initSkyContainer } from "./nature/sky.js";
import { mouse } from "./mouse.js";
import { idOfBlock } from "./nature/blockMecha/blockMechanism.js";
import { eventBus } from "./others/eventBus.js";

import * as PIXI from 'pixi.js';
import { apiMethod } from "../apiox/method.js";

//@ts-ignore - defaultOptions
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application({
    width: room.width,
    height: room.height,
    antialias: false,
    backgroundAlpha: 0,
});
const viewStyle = (app.view as HTMLCanvasElement).style;
viewStyle.position = 'absolute';
viewStyle.left = '0';
viewStyle.top = '0';
viewStyle.width = room.width + 'px';
viewStyle.height = room.height + 'px';
app.stage.sortableChildren = true;

//天空图层挂载到舞台最底层（zIndex=0），位于世界图层之下
initSkyContainer(app.stage);

//将 Pixi 画布插入到游戏容器中，放置于其他 Canvas 之上
const gameRoom = apiMethod.select('.GameRoom');
if (gameRoom) {
    gameRoom.appendChild(app.view as HTMLCanvasElement);
}

export function genericTextStyle(fontSize: number=24): PIXI.TextStyle {
    return new PIXI.TextStyle({
        fontFamily: 'Unifont', //这里的名字必须与字体文件内部定义的名称一致
        fontSize: fontSize,
        fill: '#ffffff',
        dropShadow: true, //启用阴影
        dropShadowColor: 0x000000,
        dropShadowAlpha: 0.8,
        dropShadowBlur: 0, //模糊程度
        dropShadowDistance: 2, //阴影偏移距离
        dropShadowAngle: Math.PI / 4, //阴影角度（45度向下）
        padding: 10,
    });
}

export let isDrawing: boolean = false;
const img = {
    destory: new Image(),
    grass: new Image(), dirt: new Image(), stone: new Image(),
    oak: new Image(), leaves: new Image(), cobblestone: new Image(),
    sand: new Image(), snowGrass: new Image(), sandstone: new Image(),
    planks: new Image(), crafting_table: new Image(),
    iron_ore: new Image(), coal_ore: new Image(),
    invicon_grass: new Image(), cactus: new Image(), deadBush: new Image(),
    oak_door_bottom: new Image(), oak_door_top: new Image(), oak_door_bottom_open: new Image(), oak_door_top_open: new Image(),
    stone_dark: new Image(),
    chest: new Image(), furnace: new Image(),
    glass: new Image(),
};
img.destory.src = '/assets/images/games/blocks/destory/destory_strip10.png';
img.grass.src = '/assets/images/games/blocks/grass.png';
img.dirt.src = '/assets/images/games/blocks/dirt.png';
img.stone.src = '/assets/images/games/blocks/stone.png';
img.oak.src = '/assets/images/games/blocks/oak.png';
img.leaves.src = '/assets/images/games/blocks/leaves.png';
img.cobblestone.src = '/assets/images/games/blocks/cobblestone.png';
img.sand.src = '/assets/images/games/blocks/sand.png';
img.snowGrass.src = '/assets/images/games/blocks/grass_block_snow.png';
img.sandstone.src = '/assets/images/games/blocks/sandstone.png';
img.planks.src = '/assets/images/games/blocks/planks.png';
img.crafting_table.src = '/assets/images/games/blocks/crafting_table.png';
img.iron_ore.src = '/assets/images/games/blocks/ore/iron_ore.png';
img.coal_ore.src = '/assets/images/games/blocks/ore/coal_ore.png';
img.invicon_grass.src = '/assets/images/games/blocks/Invicon_Grass.png';
img.cactus.src = '/assets/images/games/blocks/cactus.png';
img.deadBush.src = '/assets/images/games/blocks/deadBush.png';
img.oak_door_bottom.src = '/assets/images/games/blocks/others/oak_door_bottom_closed.png';
img.oak_door_top.src = '/assets/images/games/blocks/others/oak_door_top_closed.png';
img.oak_door_bottom_open.src = '/assets/images/games/blocks/oak_door_bottom.png';
img.oak_door_top_open.src = '/assets/images/games/blocks/oak_door_top.png';
img.stone_dark.src = '/assets/images/games/blocks/others/stone_dark.png';
img.chest.src = '/assets/images/games/blocks/chest.png';
img.furnace.src = '/assets/images/games/blocks/furnace.png';
img.glass.src = '/assets/images/games/blocks/glass.png';

const images = [
    img.destory,
    img.grass, img.dirt, img.stone, img.oak, img.leaves, img.cobblestone,
    img.sand, img.snowGrass, img.sandstone, img.planks, img.crafting_table,
    img.coal_ore, img.iron_ore,
    img.invicon_grass, img.cactus, img.deadBush,
    img.oak_door_bottom, img.oak_door_top, img.oak_door_bottom_open, img.oak_door_top_open,
    img.stone_dark,
    img.chest, img.furnace,
    img.glass
];
let imagesLoaded: number = 0;
function checkAllLoaded(): void {
    imagesLoaded++;
    if (imagesLoaded === images.length) {
        isDrawing = true;

        initSkyBackground();
        initBlockTextures();
        eventBus.emit('textures:ready'); // 通知依赖 blockTextures 的模块可以安全创建纹理了

        //鼠标 UI 容器
        const mouseUIContainer = new PIXI.Container();
        app.stage.addChild(mouseUIContainer);
        mouseUIContainer.zIndex = 2;

        //鼠标光标
        cursorSprite = new PIXI.Graphics();
        cursorSprite.lineStyle(1, 0x000000, 0.7); //黑色边框，宽度1
        cursorSprite.drawRect(0, 0, 64, 64); //64x64空心矩形
        cursorSprite.visible = false;
        mouseUIContainer.addChild(cursorSprite);

        //破坏动画（预生成10帧）
        const destroyBaseTex = (blockTextures['destory'] as PIXI.Texture).baseTexture;
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
    }
}
images.forEach(img => img.addEventListener('load', checkAllLoaded));

let cursorSprite: PIXI.Graphics;
let destroySprite: PIXI.Sprite;
let destroyFrames: PIXI.Texture[] = [];

export const blockTextures: Record<number | string, PIXI.Texture> = {};
function initBlockTextures() {
    blockTextures[idOfBlock.grass] = PIXI.Texture.from(img.grass);
    blockTextures[idOfBlock.dirt] = PIXI.Texture.from(img.dirt);
    blockTextures[idOfBlock.stone] = PIXI.Texture.from(img.stone);
    blockTextures[idOfBlock.oak] = PIXI.Texture.from(img.oak);
    blockTextures[idOfBlock.leaves] = PIXI.Texture.from(img.leaves);
    blockTextures[idOfBlock.cobblestone] = PIXI.Texture.from(img.cobblestone);
    blockTextures[idOfBlock.sand] = PIXI.Texture.from(img.sand);
    blockTextures[idOfBlock.snowGrass] = PIXI.Texture.from(img.snowGrass);
    blockTextures[idOfBlock.sandstone] = PIXI.Texture.from(img.sandstone);
    blockTextures[idOfBlock.planks] = PIXI.Texture.from(img.planks);
    blockTextures[idOfBlock.crafting_table] = PIXI.Texture.from(img.crafting_table);
    blockTextures[idOfBlock.iron_ore] = PIXI.Texture.from(img.iron_ore);
    blockTextures[idOfBlock.coal_ore] = PIXI.Texture.from(img.coal_ore);
    blockTextures[idOfBlock.invicon_grass] = PIXI.Texture.from(img.invicon_grass);
    blockTextures[idOfBlock.cactus] = PIXI.Texture.from(img.cactus);
    blockTextures[idOfBlock.deadBush] = PIXI.Texture.from(img.deadBush);
    blockTextures[idOfBlock.oak_door_bottom] = PIXI.Texture.from(img.oak_door_bottom);
    blockTextures[idOfBlock.oak_door_top] = PIXI.Texture.from(img.oak_door_top);
    blockTextures[idOfBlock.oak_door_bottom_open] = PIXI.Texture.from(img.oak_door_bottom_open);
    blockTextures[idOfBlock.oak_door_top_open] = PIXI.Texture.from(img.oak_door_top_open);
    blockTextures[idOfBlock.stone_dark] = PIXI.Texture.from(img.stone_dark);
    blockTextures[idOfBlock.chest] = PIXI.Texture.from(img.chest);
    blockTextures[idOfBlock.furnace] = PIXI.Texture.from(img.furnace);
    blockTextures[idOfBlock.glass] = PIXI.Texture.from(img.glass);
    blockTextures['destory'] = PIXI.Texture.from(img.destory);
}

const worldContainer: PIXI.Container = new PIXI.Container();
app.stage.addChild(worldContainer);
worldContainer.zIndex = 1;

// 预估最大可见方块数
const maxTilesX: number = Math.ceil(room.width / 64) + 2;
const maxTilesY: number = Math.ceil(room.height / 64) + 2;
const maxVisibleTiles: number = maxTilesX * maxTilesY;

// Sprite 池
const tileSprites: PIXI.Sprite[] = [];
for (let i: number = 0; i < maxVisibleTiles; i++) {
    const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    sprite.width = 64;
    sprite.height = 64;
    sprite.visible = false;
    worldContainer.addChild(sprite);
    tileSprites.push(sprite);
}

function updateWorldPixi(): void {
    if (!isDrawing) {return;}

    const startRow: number = Math.floor(player.y / 64) - Math.floor(room.height / 128);
    const startCol: number = Math.floor(player.x / 64) - Math.floor(room.width / 128);
    const rowsToDraw: number = Math.ceil(room.height / 64) + 2;
    const colsToDraw: number = Math.ceil(room.width / 64) + 2;

    let index: number = 0; // 池索引

    for (let k = 0; k < rowsToDraw; k++) {
        const worldRow: number = startRow + k;
        const draw_y: number = worldRow * 64 - player.y + player.screen_y;

        // 行越界时，仍需消耗池中的 sprite（设为不可见）
        for (let i = 0; i < colsToDraw; i++) {
            const worldCol: number = startCol + i;
            const draw_x: number = worldCol * 64 - player.x + player.screen_x;
            const sprite: PIXI.Sprite = tileSprites[index];
            if (!sprite) {break;}

            if (isOutOfBounds(worldRow, worldCol) || isOutOfBounds(worldRow, 0)) {
                sprite.visible = false;
                index++;
                continue;
            }

            const blockType: number = world[worldRow][worldCol];
            const texture: PIXI.Texture = blockTextures[blockType];
            if (texture) {
                sprite.texture = texture;
                sprite.position.set(draw_x, draw_y);
                sprite.visible = true;
            } else {
                sprite.visible = false;
            }

            index++;
        }
    }

    // 隐藏池中剩余的 sprite（实际不会超出 maxVisibleTiles，但为了安全）
    for (let i: number = index; i < tileSprites.length; i++) {
        tileSprites[i].visible = false;
    }
}

function updateMouseSprites(): void {
    if (!cursorSprite || !destroySprite) {return;}

    if (!mouse.can_use) {
        cursorSprite.visible = false;
        destroySprite.visible = false;
        return;
    }

    // 计算屏幕坐标（假设每格 64px）
    const screenX: number = player.screen_x + mouse.world_x * 64 - player.x;
    const screenY: number = player.screen_y + mouse.world_y * 64 - player.y;

    // 光标
    cursorSprite.position.set(screenX, screenY);
    cursorSprite.visible = true;

    // 破坏动画（mouse.destory 范围 1~9）
    if (mouse.destory > 0 && mouse.destory < 10) {
        destroySprite.texture = destroyFrames[mouse.destory];
        destroySprite.position.set(screenX, screenY);
        destroySprite.visible = true;
    } else {
        destroySprite.visible = false;
    }
}

function checkBlock(
ctx: CanvasRenderingContext2D,
drawingObj: number,
x: number, y: number,
width: number, height: number,
sx: number=0, sy: number=0,
sw: number=16, sh: number=16): void {
    switch(drawingObj) {
        case 0: ctx.drawImage(img.grass, sx, sy, sw, sh, x, y, width, height); break;
        case 1: ctx.drawImage(img.dirt, sx, sy, sw, sh, x, y, width, height); break;
        case 2: ctx.drawImage(img.stone, sx, sy, sw, sh, x, y, width, height); break;
        case -2: ctx.drawImage(img.oak, sx, sy, sw, sh, x, y, width, height); break;
        case 3: ctx.drawImage(img.leaves, sx, sy, sw, sh, x, y, width, height); break;
        case 4: ctx.drawImage(img.cobblestone, sx, sy, sw, sh, x, y, width, height); break;
        case 5: ctx.drawImage(img.sand, sx, sy, sw, sh, x, y, width, height); break;
        case 6: ctx.drawImage(img.snowGrass, sx, sy, sw, sh, x, y, width, height); break;
        case 7: ctx.drawImage(img.sandstone, sx, sy, sw, sh, x, y, width, height); break;
        case 8: ctx.drawImage(img.planks, sx, sy, sw, sh, x, y, width, height); break;
        case 9: ctx.drawImage(img.crafting_table, sx, sy, sw, sh, x, y, width, height); break;
        case 10: ctx.drawImage(img.iron_ore, sx, sy, sw, sh, x, y, width, height); break;
        case 11: ctx.drawImage(img.coal_ore, sx, sy, sw, sh, x, y, width, height); break;
        case -3: ctx.drawImage(img.invicon_grass, sx, sy, sw, sh, x, y, width, height); break;
        case -4: ctx.drawImage(img.cactus, sx, sy, sw, sh, x, y, width, height); break;
        case -5: ctx.drawImage(img.deadBush, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.oak_door_bottom: ctx.drawImage(img.oak_door_bottom, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.oak_door_top: ctx.drawImage(img.oak_door_top, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.oak_door_bottom_open: ctx.drawImage(img.oak_door_bottom_open, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.oak_door_top_open: ctx.drawImage(img.oak_door_top_open, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.stone_dark: ctx.drawImage(img.stone_dark, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.chest: ctx.drawImage(img.chest, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.furnace: ctx.drawImage(img.furnace, sx, sy, sw, sh, x, y, width, height); break;
        case idOfBlock.glass: ctx.drawImage(img.glass, sx, sy, sw, sh, x, y, width, height); break;
    }
}

export { updateWorldPixi, updateMouseSprites, img, checkBlock, app, gameRoom };
