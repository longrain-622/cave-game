// gui.ts
// GUI 覆写层：Application、按钮/界面贴图、顶层容器与挂载。
import * as PIXI from 'pixi.js';
import { room } from '../../../constants/generic.js';
import { ensureAssetsInit } from '../../../constants/pixiAssets.js';
import { gameRoom } from '../rendering.js';
import { initTouchButtons } from './gameGUI/mobileTouch.js';

function createGuiApp(): PIXI.Application {
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
    viewStyle.zIndex = '10';
    viewStyle.touchAction = 'none'; //禁止浏览器默认触摸行为
    viewStyle.pointerEvents = 'auto'; //确保指针事件开启
    app.stage.sortableChildren = true;
    return app;
}

export const guiApp: PIXI.Application = createGuiApp();

//按钮图像
export const buttonTextures = {
    fullTexture: null as PIXI.Texture | null,
    normal: null as PIXI.Texture | null,
    hover: null as PIXI.Texture | null,

    async init() {
        this.fullTexture = await PIXI.Assets.load('/assets/images/games/gui/widgets.png');
        if (this.fullTexture) {
            this.normal = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 66, 200, 20));
            this.hover = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 86, 200, 20));
        } else {
            this.normal = null;
            this.hover = null;
        }
        return this;
    }
};

// GUI 贴图资源表（alias -> 路径），通过 PixiJS Assets 加载
// 注意：players.png 由渲染层直接 BaseTexture.from 加载（共享同一实例），不在此重复加载
const guiAssets: Record<string, string> = {
    inventory: '/assets/images/games/gui/container/inventory.png',
    widgets: '/assets/images/games/gui/widgets.png',
    icons: '/assets/images/games/gui/hearts/icons.png',
    crafting_table: '/assets/images/games/gui/container/craftingtable.png',
    chest: '/assets/images/games/gui/shulker_box.png',
    furnace: '/assets/images/games/gui/furnace_gui.png',
};

// 加载后的 GUI 贴图纹理（按 alias 索引），供各 GUI 模块直接使用
export const guiTextures: Record<string, PIXI.Texture> = {};
export let gui_isDrawing: boolean = false;

// GUI 顶层容器（各渲染模块共用）
export const guiContainer = new PIXI.Container();
export const inventoryContainer = new PIXI.Container();
export const widgetContainer = new PIXI.Container();
export const floatContainer = new PIXI.Container();
export const heartContainer = new PIXI.Container();
export const craftingTableContainer = new PIXI.Container();
export const deathContainer = new PIXI.Container();

// 把 GUI 顶层容器挂载到舞台（幂等）。
/*
    读档进入游戏时玩家可能已经死亡，此时 GUI 渲染循环因 hp <= 0 不会调用 drawInventory，
    死亡界面必须自己保证挂载（见 death），所以挂载逻辑不能只留在 initInventoryUI 里。
*/
export function ensureGuiMounted(): void {
    if (!guiContainer.parent) {
        guiApp.stage.addChild(guiContainer);
        guiContainer.addChild(inventoryContainer, heartContainer, craftingTableContainer, deathContainer, floatContainer);
    }
    if (!widgetContainer.parent) {
        guiApp.stage.addChild(widgetContainer);
    }
}

function loadGuiTextures(): void {
    // 用 PixiJS Assets 加载 GUI 贴图，全部就绪后再填充 guiTextures
    PIXI.Assets.load<Record<string, PIXI.Texture>>(Object.values(guiAssets)).then((textures: Record<string, PIXI.Texture>) => {
        for (const [alias, url] of Object.entries(guiAssets)) {
            guiTextures[alias] = textures[url];
        }
        gui_isDrawing = true;
    }).catch((error: unknown) => {
        console.error('load gui textures error', error);
    });
}

function initContainers(): void {
    guiContainer.sortableChildren = true;
    guiContainer.zIndex = 9;

    inventoryContainer.visible = false;
    inventoryContainer.zIndex = 2;

    widgetContainer.visible = true;
    widgetContainer.zIndex = 8;

    floatContainer.zIndex = 10;

    heartContainer.visible = true;
    heartContainer.zIndex = 0;

    craftingTableContainer.visible = false;
    craftingTableContainer.zIndex = 3;
}

async function main(): Promise<void> {
    initContainers();
    loadGuiTextures();

    // 顶层 await：资源就绪后才算加载完本模块，导入方顶层即可直接使用贴图
    await ensureAssetsInit();
    await PIXI.Assets.load('/assets/fonts/unifont.ttf');
    initTouchButtons(guiApp);
    await buttonTextures.init();
    if (gameRoom) {gameRoom.appendChild(guiApp.view as HTMLCanvasElement);}
    else {console.log('GUI application init failure.');}
}
await main();
