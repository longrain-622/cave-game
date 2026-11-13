import * as PIXI from 'pixi.js';
import { room } from '../constants/generic.js';
import { ensureAssetsInit } from '../constants/pixiAssets.js';
import { apiMethod, log } from '../apiox/method.js';

// 开始界面画布尺寸：宽度与 #whiteBlock2 的网格列宽一致，高度与 #startingCanvasHost 保持一致
const START_SURFACE_WIDTH: number = Math.floor(room.width * 0.75);
const START_SURFACE_HEIGHT: number = 540;
const SKIN_SCALE: number = 5;
const SKIN_WIDTH: number = 16 * SKIN_SCALE;
const SKIN_HEIGHT: number = 32 * SKIN_SCALE;
const SKIN_TOP_Y: number = 128;
const MULTI_TRIANGLE_SPREAD: number = SKIN_WIDTH + 8;

let contentApp: PIXI.Application | null = null;
let startScene: PIXI.Container | null = null;
let startSkinsLoaded: boolean = false;

function applyCanvasSurface(canvas: HTMLCanvasElement, container: Element, width: number, height: number, pointerEvents: string): void {
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = String(width) + 'px';
    canvas.style.height = String(height) + 'px';
    canvas.style.pointerEvents = pointerEvents;
    // 画布随 content 一起被 CSS 缩放，禁用浏览器插值以保持像素锐利
    canvas.style.imageRendering = 'pixelated';
    container.appendChild(canvas);
}

function createSkinSprite(texture: PIXI.Texture): PIXI.Sprite {
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, 0);
    sprite.scale.set(SKIN_SCALE);
    return sprite;
}

async function loadStartSkins(scene: PIXI.Container): Promise<void> {
    if (startSkinsLoaded) {return;}
    try {
        await ensureAssetsInit();
        const steveTexture: PIXI.Texture = await PIXI.Assets.load('/assets/images/games/player/steve.png');
        const alexTexture: PIXI.Texture = await PIXI.Assets.load('/assets/images/games/player/alex.png');

        // 单人游戏文本正下方：Steve
        const singleSkin = createSkinSprite(steveTexture);
        singleSkin.position.set(START_SURFACE_WIDTH * 0.25, SKIN_TOP_Y);
        scene.addChild(singleSkin);

        // 多人游戏文本下方：上方 Steve，左下 Alex，右下暂用 Steve，呈三角形
        const multiCenterX: number = START_SURFACE_WIDTH * 0.75;
        const multiBottomY: number = SKIN_TOP_Y + SKIN_HEIGHT / 2;
        const multiTopSkin = createSkinSprite(steveTexture);
        const multiLeftSkin = createSkinSprite(alexTexture);
        const multiRightSkin = createSkinSprite(steveTexture);
        multiTopSkin.position.set(multiCenterX, SKIN_TOP_Y);
        multiLeftSkin.position.set(multiCenterX - MULTI_TRIANGLE_SPREAD, multiBottomY);
        multiRightSkin.position.set(multiCenterX + MULTI_TRIANGLE_SPREAD, multiBottomY);
        scene.addChild(multiTopSkin, multiLeftSkin, multiRightSkin);

        startSkinsLoaded = true;
    } catch (e) {
        log.warn('contentRenderer.ts cannot load player skins', e);
    }
}

function getStartScene(app: PIXI.Application): PIXI.Container {
    if (startScene === null) {
        startScene = new PIXI.Container();
        startScene.zIndex = 10;
        app.stage.addChild(startScene);
        void loadStartSkins(startScene);
    }
    return startScene;
}

/** 获取开始界面与存档列表共用的 PixiJS Application */
export function getContentApp(): PIXI.Application {
    if (contentApp === null) {
        contentApp = new PIXI.Application({
            width: START_SURFACE_WIDTH,
            height: START_SURFACE_HEIGHT,
            antialias: false,
            backgroundAlpha: 0,
        });
        contentApp.stage.sortableChildren = true;
    }
    return contentApp;
}

/** 初始化开始界面的渲染内容 */
export function initContentRenderer(): void {
    getStartScene(getContentApp());
    showStartSurface();
}

/** 把共享画布挂到开始界面的人物区域并显示人物 */
export function showStartSurface(): void {
    const app: PIXI.Application = getContentApp();
    const canvas = app.view as HTMLCanvasElement;
    const host: Element | null = apiMethod.select('#startingCanvasHost');

    app.renderer.resize(START_SURFACE_WIDTH, START_SURFACE_HEIGHT);
    if (host) {
        applyCanvasSurface(canvas, host, START_SURFACE_WIDTH, START_SURFACE_HEIGHT, 'none');
    }
    getStartScene(app).visible = true;
}

/** 把共享画布挂到存档列表区域并隐藏开始界面人物 */
export function showArchiveSurface(container: Element, width: number, height: number): void {
    const app: PIXI.Application = getContentApp();
    const canvas = app.view as HTMLCanvasElement;

    app.renderer.resize(width, height);
    applyCanvasSurface(canvas, container, width, height, 'auto');
    getStartScene(app).visible = false;
}
