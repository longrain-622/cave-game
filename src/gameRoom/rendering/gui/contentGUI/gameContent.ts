import { apioxHttp } from "../../../../apiox/http.js";
import { getLang } from '../../../../others/i18nLang.js';
import { room } from "../../../../constants/generic.js";
import { textStyle2 } from "../../../../constants/pixiStyles.js";
import { uistate } from "../../../gui/uiState.js";
import { quitGame } from "../../../gui/contentGUI/gameContent.js";
import { guiApp, buttonTextures } from "../application.js";
import { showExitPage } from "./exitingPage.js";
import * as PIXI from 'pixi.js';

// 按钮尺寸
const btnW = 200;
const btnH = 20;
const centerX = room.width / 2;
const centerY = room.height / 2;
const gap = 20; // 相邻按钮之间的垂直间距
const btnScale = 3;
const btnStep = btnH * btnScale + gap; // 相邻按钮中心点的垂直距离
const fontSize: number = 24;
const fontY_offset: number = 4;

interface ContentButton {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    label: PIXI.Text;
    sprite: PIXI.Sprite;
}

interface GameContentTexts {
    title: string;
    backToGame: string;
    exitToContent: string;
    openLAN: string;
}

const gameContent = new PIXI.Container();
const blackBg = new PIXI.Graphics();
const txt = { title: new PIXI.Text('', textStyle2()) };

let topBtn: ContentButton;
let openLanBtn: ContentButton;
let bottomBtn: ContentButton;
let contentButtons: ContentButton[] = [];

function initContentButton(
    cx: number,
    cy: number,
    width: number = btnW,
    height: number = btnH
): ContentButton {
    const label = new PIXI.Text('', textStyle2());
    label.style.fontSize = fontSize;
    label.anchor.set(0.5);
    label.position.set(cx, cy + fontY_offset);

    const button: ContentButton = {
        width: width,
        height: height,
        centerX: cx,
        centerY: cy,
        label: label,
        sprite: new PIXI.Sprite(buttonTextures.normal!),
    };

    button.sprite.anchor.set(0.5);
    button.sprite.position.set(cx, cy);
    button.sprite.scale.set(btnScale, btnScale);
    button.sprite.eventMode = 'static';
    button.sprite.cursor = 'pointer';

    button.sprite.on('pointerover', () => { // 鼠标/指针进入
        if (buttonTextures.hover) {button.sprite.texture = buttonTextures.hover;}
    });
    button.sprite.on('pointerout', () => { // 鼠标/指针离开
        if (buttonTextures.normal) {button.sprite.texture = buttonTextures.normal;}
    });

    return button;
}

// 以 centerY 为中心，按数组顺序从上到下等间距排列按钮
function layoutContentButtons(buttons: ContentButton[]): void {
    const firstY: number = centerY - ((buttons.length - 1) * btnStep) / 2;
    buttons.forEach((button: ContentButton, index: number): void => {
        const y: number = firstY + index * btnStep;
        button.centerY = y;
        button.sprite.position.y = y;
        button.label.position.y = y + fontY_offset;
    });
}

async function loadGameContentTexts(): Promise<void> {
    try {
        const data = await apioxHttp.get<{ gameContent: GameContentTexts }>(`assets/locales/${getLang()}/game.json`);
        const specificOrder = ['title', 'backToGame', 'exitToContent', 'openLAN'] as const;
        const [titleText, backText, exitText, lanText] = specificOrder.map(key => data.gameContent[key]);

        txt.title.text = titleText;
        topBtn.label.text = backText;
        bottomBtn.label.text = exitText;
        openLanBtn.label.text = lanText;
    } catch (error) {
        console.error('load game text error', error);
    }
}

function setupPauseMenu(): void {
    gameContent.zIndex = 10;
    gameContent.visible = uistate.gameContent_isOpening;
    guiApp.stage.addChild(gameContent);

    // 黑色背景
    blackBg.beginFill(0x000000, 0.7);
    blackBg.drawRect(0, 0, room.width, room.height);
    blackBg.endFill();
    blackBg.visible = true;
    gameContent.addChild(blackBg);

    // 按钮（数组顺序即从上到下的显示顺序）
    topBtn = initContentButton(centerX, centerY);
    openLanBtn = initContentButton(centerX, centerY);
    bottomBtn = initContentButton(centerX, centerY);
    contentButtons = [topBtn, openLanBtn, bottomBtn];
    layoutContentButtons(contentButtons);

    for (const button of contentButtons) {gameContent.addChild(button.sprite);}
    for (const button of contentButtons) {gameContent.addChild(button.label);}

    /*设置文本样式*/ {
        txt.title.style.fontSize = fontSize;
        txt.title.anchor.set(0.5);
        txt.title.position.set(room.width / 2, room.height / 4);
    }
    gameContent.addChild(txt.title);

    topBtn.sprite.on('pointerdown', () => {
        uistate.gameContent_isOpening = false;
    });
    bottomBtn.sprite.on('pointerdown', async () => {
        showExitPage();
        await quitGame();
    });

    void loadGameContentTexts();
}

// 每帧同步暂停菜单可见性（开关状态由 input/guiInput.ts 维护）
export function updatePauseMenu(): void {
    gameContent.visible = uistate.gameContent_isOpening;
}

function main(): void {
    setupPauseMenu();
}
main();
