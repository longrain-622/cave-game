import { apioxEvent, ApioxKeyboardEvent } from "../../../apiox/event.js";
import { apioxHttp } from "../../../apiox/http.js";
import { reloadPage } from "../../../apiox/method.js";
import { saveGameToLocal } from "../../../user/saveWorld.js";
import { lang } from "../../../others/i18n.js";
import { guiApp } from "../application.js";
import { room } from "../../../constants/generic.js";
import { buttonTextures } from "../application.js";
import { genericTextStyle } from "../../rendering.js";
import { uistate } from "../uiState.js";
import * as PIXI from 'pixi.js';

let gameContent = new PIXI.Container();
gameContent.zIndex = 10;
gameContent.visible = uistate.gameContent_isOpening;
guiApp.stage.addChild(gameContent);

//黑色背景
const blackBg = new PIXI.Graphics();
blackBg.beginFill(0x000000, 0.7);
blackBg.drawRect(0, 0, room.width, room.height);
blackBg.endFill();
blackBg.visible = true;
gameContent.addChild(blackBg);
gameContent.setChildIndex(blackBg, 0);

//按钮尺寸
//const btnW = 200;
const btnH = 20;
const centerX = room.width / 2;
const centerY = room.height / 2;
const gap = 30; // 两个按钮之间的垂直间距
const btnScale = 3;

// 创建按钮
const topBtn = new PIXI.Sprite(buttonTextures.normal!);
topBtn.anchor.set(0.5); //以中心点为基准定位
topBtn.position.set(centerX, centerY - btnH / 2 - gap);
topBtn.eventMode = 'static';
topBtn.cursor = 'pointer';
topBtn.scale.set(btnScale, btnScale);
topBtn.on('pointerover', () => { //鼠标/指针进入
    topBtn.texture = buttonTextures.hover;
});
topBtn.on('pointerout', () => { //鼠标/指针离开
    topBtn.texture = buttonTextures.normal;
});

const bottomBtn = new PIXI.Sprite(buttonTextures.normal!); //第二个按钮
bottomBtn.anchor.set(0.5);
bottomBtn.position.set(centerX, centerY + btnH / 2 + gap);
bottomBtn.eventMode = 'static';
bottomBtn.cursor = 'pointer';
bottomBtn.scale.set(btnScale, btnScale);
bottomBtn.on('pointerover', () => { //鼠标/指针进入
    bottomBtn.texture = buttonTextures.hover;
});
bottomBtn.on('pointerout', () => { //鼠标/指针离开
    bottomBtn.texture = buttonTextures.normal;
});

gameContent.addChild(topBtn, bottomBtn);
topBtn.visible = true;
bottomBtn.visible = true;

const txt = { //文本对象
    backToGame: new PIXI.Text('', genericTextStyle()),
    backToTitle: new PIXI.Text('', genericTextStyle()),
}

/*设置文本样式*/ {
    const fontSize: number = 24;
    txt.backToGame.style.fontSize = fontSize;
    txt.backToGame.style.fontSize = fontSize;
    txt.backToGame.anchor.set(0.5);
    txt.backToTitle.anchor.set(0.5);
    const fontY_offset: number = 4;
    txt.backToGame.position.set(topBtn.x, topBtn.y + fontY_offset); //位置与 topBtn 相同
    txt.backToTitle.position.set(bottomBtn.x, bottomBtn.y + fontY_offset); //位置与 bottomBtn 相同
}

async function loadGameContentTexts() {
    try {
        const data = await apioxHttp.get<{ gameContent: { backToGame: string; exitToContent: string } }>(`/assets/locales/${lang}/game.json`);
        const specificOrder = ['backToGame', 'exitToContent'] as const;
        const [backText, exitText] = specificOrder.map(key => data.gameContent[key]);

        txt.backToGame.text = backText;
        txt.backToTitle.text = exitText;
    } catch (error) {
        console.error('load game text error', error);
    }
}
loadGameContentTexts();

gameContent.addChild(txt.backToGame);
gameContent.addChild(txt.backToTitle);

apioxEvent.onKeyDown((e: ApioxKeyboardEvent): void => {
    if(e.key !== 'Escape') {return;}
    if(e.repeat) {return;}
    if(uistate.anyui_isOpening() && !uistate.gameContent_isOpening) {return;}
    uistate.gameContent_isOpening = !uistate.gameContent_isOpening;
    gameContent.visible = uistate.gameContent_isOpening;
});
topBtn.on('pointerdown', () => {
    uistate.gameContent_isOpening = false;
    gameContent.visible = false;
});
bottomBtn.on('pointerdown', async () => {
    await saveGameToLocal();
    reloadPage();
});