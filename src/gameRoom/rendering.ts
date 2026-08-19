//rendering.ts
import { isOutOfBounds, world } from './world.js';
import { room } from '../constants/generic.js';
import { player } from './player.js';
import { initSkyBackground, initSkyContainer } from './nature/sky.js';
import { mouse } from './mouse.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';
import { eventBus } from './others/eventBus.js';

import * as PIXI from 'pixi.js';
import { apiMethod } from '../apiox/method.js';

// 方块贴图资源表（alias -> 路径），通过 PixiJS Assets 加载
const blockAssets: Record<string, string> = {
    destory: '/assets/images/games/blocks/destory/destory_strip10.png',
    grass: '/assets/images/games/blocks/grass.png',
    dirt: '/assets/images/games/blocks/dirt.png',
    stone: '/assets/images/games/blocks/stone.png',
    oak: '/assets/images/games/blocks/oak.png',
    leaves: '/assets/images/games/blocks/leaves.png',
    cobblestone: '/assets/images/games/blocks/cobblestone.png',
    sand: '/assets/images/games/blocks/sand.png',
    snowGrass: '/assets/images/games/blocks/grass_block_snow.png',
    sandstone: '/assets/images/games/blocks/sandstone.png',
    planks: '/assets/images/games/blocks/planks.png',
    crafting_table: '/assets/images/games/blocks/crafting_table.png',
    iron_ore: '/assets/images/games/blocks/ore/iron_ore.png',
    coal_ore: '/assets/images/games/blocks/ore/coal_ore.png',
    invicon_grass: '/assets/images/games/blocks/Invicon_Grass.png',
    cactus: '/assets/images/games/blocks/cactus.png',
    deadBush: '/assets/images/games/blocks/deadBush.png',
    oak_door_bottom: '/assets/images/games/blocks/others/oak_door_bottom_closed.png',
    oak_door_top: '/assets/images/games/blocks/others/oak_door_top_closed.png',
    oak_door_bottom_open: '/assets/images/games/blocks/oak_door_bottom.png',
    oak_door_top_open: '/assets/images/games/blocks/oak_door_top.png',
    stone_dark: '/assets/images/games/blocks/others/stone_dark.png',
    chest: '/assets/images/games/blocks/chest.png',
    furnace: '/assets/images/games/blocks/furnace.png',
    glass: '/assets/images/games/blocks/glass.png',
    andesite: '/assets/images/games/blocks/andesite.png',
    diorite: '/assets/images/games/blocks/diorite.png',
    granite: '/assets/images/games/blocks/granite.png',
    bedrock: '/assets/images/games/blocks/bedrock.png',
};

export let isDrawing: boolean = false;
export const blockTextures: Record<number | string, PIXI.Texture> = {};

export let app: PIXI.Application;
export let gameRoom: Element | null;
let worldContainer: PIXI.Container;
let tileSprites: PIXI.Sprite[] = [];
let cursorSprite: PIXI.Graphics;
let destroySprite: PIXI.Sprite;
let destroyFrames: PIXI.Texture[] = [];

// Assets.load 按 url 返回纹理，转成 alias 索引便于 initBlockTextures 使用
function toAliasTextures(textures: Record<string, PIXI.Texture>): Record<string, PIXI.Texture> {
    const byAlias: Record<string, PIXI.Texture> = {};
    for (const [alias, url] of Object.entries(blockAssets)) {
        byAlias[alias] = textures[url];
    }
    return byAlias;
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
    const viewStyle: CSSStyleDeclaration = (app.view as HTMLCanvasElement).style;
    viewStyle.position = 'absolute';
    viewStyle.left = '0';
    viewStyle.top = '0';
    viewStyle.width = room.width + 'px';
    viewStyle.height = room.height + 'px';
    app.stage.sortableChildren = true;

    // 天空图层
    initSkyContainer(app.stage);

    gameRoom = apiMethod.select('.GameRoom');
    if (gameRoom) {
        gameRoom.appendChild(app.view as HTMLCanvasElement);
    }
}

function initWorldLayer(): void {
    worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);
    worldContainer.zIndex = 1;

    // 预估最大可见方块数
    const maxTilesX: number = Math.ceil(room.width / 64) + 2;
    const maxTilesY: number = Math.ceil(room.height / 64) + 2;
    const maxVisibleTiles: number = maxTilesX * maxTilesY;

    // Sprite 池
    for (let i: number = 0; i < maxVisibleTiles; i++) {
        const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 64;
        sprite.height = 64;
        sprite.visible = false;
        worldContainer.addChild(sprite);
        tileSprites.push(sprite);
    }
}

function initBlockTextures(textures: Record<string, PIXI.Texture>): void {
    blockTextures[idOfBlock.grass] = textures['grass'];
    blockTextures[idOfBlock.dirt] = textures['dirt'];
    blockTextures[idOfBlock.stone] = textures['stone'];
    blockTextures[idOfBlock.oak] = textures['oak'];
    blockTextures[idOfBlock.leaves] = textures['leaves'];
    blockTextures[idOfBlock.cobblestone] = textures['cobblestone'];
    blockTextures[idOfBlock.sand] = textures['sand'];
    blockTextures[idOfBlock.snowGrass] = textures['snowGrass'];
    blockTextures[idOfBlock.sandstone] = textures['sandstone'];
    blockTextures[idOfBlock.planks] = textures['planks'];
    blockTextures[idOfBlock.crafting_table] = textures['crafting_table'];
    blockTextures[idOfBlock.iron_ore] = textures['iron_ore'];
    blockTextures[idOfBlock.coal_ore] = textures['coal_ore'];
    blockTextures[idOfBlock.invicon_grass] = textures['invicon_grass'];
    blockTextures[idOfBlock.cactus] = textures['cactus'];
    blockTextures[idOfBlock.deadBush] = textures['deadBush'];
    blockTextures[idOfBlock.oak_door_bottom] = textures['oak_door_bottom'];
    blockTextures[idOfBlock.oak_door_top] = textures['oak_door_top'];
    blockTextures[idOfBlock.oak_door_bottom_open] = textures['oak_door_bottom_open'];
    blockTextures[idOfBlock.oak_door_top_open] = textures['oak_door_top_open'];
    blockTextures[idOfBlock.stone_dark] = textures['stone_dark'];
    blockTextures[idOfBlock.chest] = textures['chest'];
    blockTextures[idOfBlock.furnace] = textures['furnace'];
    blockTextures[idOfBlock.glass] = textures['glass'];
    blockTextures[idOfBlock.andesite] = textures['andesite'];
    blockTextures[idOfBlock.diorite] = textures['diorite'];
    blockTextures[idOfBlock.granite] = textures['granite'];
    blockTextures[idOfBlock.bedrock] = textures['bedrock'];
    blockTextures['destory'] = textures['destory'];
}

export function genericTextStyle(fontSize: number=24): PIXI.TextStyle {
    return new PIXI.TextStyle({
        fontFamily: 'Unifont', // 这里的名字必须与字体文件内部定义的名称一致
        fontSize: fontSize,
        fill: '#ffffff',
        dropShadow: true, // 启用阴影
        dropShadowColor: 0x000000,
        dropShadowAlpha: 0.8,
        dropShadowBlur: 0, // 模糊程度
        dropShadowDistance: 2, // 阴影偏移距离
        dropShadowAngle: Math.PI / 4, // 阴影角度（45度向下）
        padding: 10,
    });
}

function main(): void {
    initApp();
    initWorldLayer();

    // 加载方块贴图
    PIXI.Assets.load<Record<string, PIXI.Texture>>(Object.values(blockAssets)).then((textures: Record<string, PIXI.Texture>) => {
        initBlockTextures(toAliasTextures(textures));
        isDrawing = true;

        initSkyBackground();
        eventBus.emit('textures:ready'); // 通知依赖 blockTextures 的模块可以安全创建纹理了

        // 鼠标 UI 容器
        const mouseUIContainer = new PIXI.Container();
        app.stage.addChild(mouseUIContainer);
        mouseUIContainer.zIndex = 2;

        // 鼠标光标
        cursorSprite = new PIXI.Graphics();
        cursorSprite.lineStyle(1, 0x000000, 0.7); // 黑色边框，宽度1
        cursorSprite.drawRect(0, 0, 64, 64); // 64x64空心矩形
        cursorSprite.visible = false;
        mouseUIContainer.addChild(cursorSprite);

        // 破坏动画
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
    }).catch((error: unknown) => {
        console.error('load block textures error', error);
    });
}
main();

export function updateWorldPixi(): void {
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
