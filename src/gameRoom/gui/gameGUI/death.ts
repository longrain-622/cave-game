import { player } from "../../player.js";
import { gui_isDrawing, deathContainer } from "./inventory.js";
import { img_gui } from "./inventoryConfig.js";
import { genericTextStyle } from "../../rendering.js";
import { room } from "../../../constants/generic.js";
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
const deathPixi: {
    deathOverlay: PIXI.Graphics,
    titleText: PIXI.Text,
    buttonSprite: PIXI.Sprite,
    buttonText: PIXI.Text,
    deathInitialized: boolean
} = {
    deathOverlay: new PIXI.Graphics(),
    titleText: new PIXI.Text(),
    buttonSprite: new PIXI.Sprite(),
    buttonText: new PIXI.Text(),
    deathInitialized: false,
}

function initDeathUI(): void {
    if (deathPixi.deathInitialized) {return;}
    deathContainer.removeChildren();

    // 在函数内创建纹理，此时 img_gui 已可用
    const widgetsTex = PIXI.Texture.from(img_gui.widgets);
    const btnNormal = new PIXI.Texture(widgetsTex.baseTexture, new PIXI.Rectangle(0, 66, 200, 20));
    const btnHover = new PIXI.Texture(widgetsTex.baseTexture, new PIXI.Rectangle(0, 86, 200, 20));

    // 半透明红色遮罩
    deathPixi.deathOverlay = new PIXI.Graphics();
    deathPixi.deathOverlay.beginFill(0xff0000, 0.5);
    deathPixi.deathOverlay.drawRect(0, 0, room.width, room.height);
    deathPixi.deathOverlay.endFill();
    deathContainer.addChild(deathPixi.deathOverlay);

    // 标题
    deathPixi.titleText = new PIXI.Text('', { ...genericTextStyle(), fontSize: 64, align: 'center' });
    deathPixi.titleText.anchor.set(0.5, 0);
    deathPixi.titleText.position.set(room.width / 2, room.height * 0.25);
    deathContainer.addChild(deathPixi.titleText);

    // 按钮
    const buttonWidth = 600, buttonHeight = 60;
    const btnX = (room.width - buttonWidth) / 2;
    const btnY = 320;
    deathPixi.buttonSprite = new PIXI.Sprite(btnNormal);
    deathPixi.buttonSprite.width = buttonWidth;
    deathPixi.buttonSprite.height = buttonHeight;
    deathPixi.buttonSprite.position.set(btnX, btnY);
    deathPixi.buttonSprite.eventMode = 'static';
    deathContainer.addChild(deathPixi.buttonSprite);

    // 按钮文字
    const fontY_offset = 4;
    deathPixi.buttonText = new PIXI.Text('', { ...genericTextStyle(), fontSize: 24, align: 'center' });
    deathPixi.buttonText.anchor.set(0.5);
    deathPixi.buttonText.position.set(btnX + buttonWidth / 2, btnY + buttonHeight / 2 + fontY_offset);
    deathContainer.addChild(deathPixi.buttonText);

    // 鼠标悬停切换纹理
    deathPixi.buttonSprite.on('mouseover', () => { deathPixi.buttonSprite.texture = btnHover; });
    deathPixi.buttonSprite.on('mouseout', () => { deathPixi.buttonSprite.texture = btnNormal; });
    // 点击复活
    deathPixi.buttonSprite.on('click', () => {
        if (player.hp <= 0) {
            player.hp = 20;
            player.initXY();
            deathContainer.visible = false;
        }
    });

    deathPixi.deathInitialized = true;
}

function drawDeadPage() {
    if (player.hp <= 0 && gui_isDrawing) {
        initDeathUI();
        deathContainer.visible = true;
        // 更新文字（国际化）
        deathPixi.titleText.text = death.str[0] || '';
        deathPixi.buttonText.text = death.str[1] || '';
        // 按钮点击逻辑已绑定
    } else {
        deathContainer.visible = false;
    }
}

export { drawDeadPage };
