import { player } from "../../player.js";
import { gui_isDrawing, img_gui, deathContainer } from "./inventory.js";
import { textStyle } from "../../rendering.js";
import { apiObjects } from "../../../apiox/dom.js";
import { apioxEvent } from "../../../apiox/event.js";
import * as PIXI from 'pixi.js';

const death: {str: string[], click: boolean} = {
    str: [],
    click: false,
};

// 更新死亡界面的文本（使用全局 t 函数）
function updateDeathTexts() {
    const t = (apiObjects.win as any).t;
    if (t) {
        death.str = [
            t('dead.title'),
            t('dead.restart'),
            t('dead.back'),
        ];
    }
}
// 监听国际化数据加载完成事件
apiObjects.win.addEventListener('i18nReady', () => {
    updateDeathTexts();
});
// 如果 i18n 在 death.ts 执行前已经加载完成，则立即更新
if ((apiObjects.win as any).t) {
    updateDeathTexts();
}
apioxEvent.listenGlobal('mousedown', () => {
    death.click = true;
});
apioxEvent.listenGlobal('mouseup', () => {
    death.click = false;
});

// Pixi 元素
let deathOverlay: PIXI.Graphics;
let titleText: PIXI.Text;
let buttonSprite: PIXI.Sprite;
let buttonText: PIXI.Text;
let deathInitialized = false;

function initDeathUI(): void {
    if (deathInitialized) {return;}
    deathContainer.removeChildren();

    // 在函数内创建纹理，此时 img_gui 已可用
    const widgetsTex = PIXI.Texture.from(img_gui.widgets);
    const btnNormal = new PIXI.Texture(widgetsTex.baseTexture, new PIXI.Rectangle(0, 66, 200, 20));
    const btnHover  = new PIXI.Texture(widgetsTex.baseTexture, new PIXI.Rectangle(0, 86, 200, 20));

    // 半透明红色遮罩
    deathOverlay = new PIXI.Graphics();
    deathOverlay.beginFill(0xff0000, 0.5);
    deathOverlay.drawRect(0, 0, window.innerWidth, window.innerHeight); // 或 room.width/height
    deathOverlay.endFill();
    deathContainer.addChild(deathOverlay);

    // 标题
    titleText = new PIXI.Text('', { ...textStyle, fontSize: 64, align: 'center' });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(window.innerWidth / 2, window.innerHeight * 0.25);
    deathContainer.addChild(titleText);

    // 按钮
    const buttonWidth = 640, buttonHeight = 64;
    const btnX = (window.innerWidth - buttonWidth) / 2;
    const btnY = 320;
    buttonSprite = new PIXI.Sprite(btnNormal);
    buttonSprite.width = buttonWidth;
    buttonSprite.height = buttonHeight;
    buttonSprite.position.set(btnX, btnY);
    buttonSprite.interactive = true;
    buttonSprite.buttonMode = true;
    deathContainer.addChild(buttonSprite);

    // 按钮文字
    buttonText = new PIXI.Text('', { ...textStyle, fontSize: 32, align: 'center' });
    buttonText.anchor.set(0.5, 0.5);
    buttonText.position.set(btnX + buttonWidth / 2, btnY + buttonHeight / 2);
    deathContainer.addChild(buttonText);

    // 鼠标悬停切换纹理
    buttonSprite.on('mouseover', () => { buttonSprite.texture = btnHover; });
    buttonSprite.on('mouseout', () => { buttonSprite.texture = btnNormal; });
    // 点击复活
    buttonSprite.on('click', () => {
        if (player.hp <= 0) {
            player.hp = 20;
            player.initXY();
            deathContainer.visible = false;
        }
    });

    deathInitialized = true;
}

function drawDeadPage() {
    if (player.hp <= 0 && gui_isDrawing) {
        initDeathUI();
        deathContainer.visible = true;
        // 更新文字（国际化）
        titleText.text = death.str[0] || '';
        buttonText.text = death.str[1] || '';
        // 按钮点击逻辑已绑定
    } else {
        deathContainer.visible = false;
    }
}

export { drawDeadPage };
