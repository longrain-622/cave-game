import { player } from "../../player.js";
import { gui_isDrawing, ensureGuiMounted } from "./inventory.js";
import { guiTextures } from "./inventoryConfig.js";
import { genericTextStyle } from "../../rendering/rendering.js";
import { room } from "../../../constants/generic.js";
import { apiObjects } from "../../../apiox/dom.js";
import { apioxEvent } from "../../../apiox/event.js";
import * as PIXI from 'pixi.js';
import { quitGame } from "../contentGUI/gameContent.js";
import { uistate } from "../uiState.js";

// 死亡界面容器
export const deathContainer = new PIXI.Container();

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
apioxEvent.listenGlobal('mousedown', () => {
    death.click = true;
});
apioxEvent.listenGlobal('mouseup', () => {
    death.click = false;
});

// Pixi 元素
interface DeathPixi {
    deathOverlay: PIXI.Graphics;
    titleText: PIXI.Text;
    buttonSprite_continue: PIXI.Sprite;
    buttonText_continue: PIXI.Text;
    buttonSprite_quit: PIXI.Sprite;
    buttonText_quit: PIXI.Text;
    deathInitialized: boolean;
}
const deathPixi: DeathPixi = {
    deathOverlay: new PIXI.Graphics(),
    titleText: new PIXI.Text(),
    buttonSprite_continue: new PIXI.Sprite(),
    buttonText_continue: new PIXI.Text(),
    buttonSprite_quit: new PIXI.Sprite(),
    buttonText_quit: new PIXI.Text(),
    deathInitialized: false,
}

function initDeathUI(): void {
    if (deathPixi.deathInitialized) {return;}
    // 开局读档时玩家可能已死亡：hp <= 0 时 gameGuiLoop 不会绘制背包，
    // 这里必须自行确保 GUI 容器已挂载，死亡界面才能显示出来
    ensureGuiMounted();
    deathContainer.removeChildren();

    // 在函数内创建纹理，此时 guiTextures 已可用
    const widgetsTex = guiTextures.widgets;
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
    const buttonWidth: number = 600, buttonHeight: number = 60;
    const btnX: number = (room.width - buttonWidth) / 2;
    const btnY_continue: number = 320;
    const btnY_quit: number = btnY_continue + buttonHeight + 32;

    deathPixi.buttonSprite_continue = new PIXI.Sprite(btnNormal);
    deathPixi.buttonSprite_continue.width = buttonWidth;
    deathPixi.buttonSprite_continue.height = buttonHeight;
    deathPixi.buttonSprite_continue.position.set(btnX, btnY_continue);
    deathPixi.buttonSprite_continue.eventMode = 'static';
    deathContainer.addChild(deathPixi.buttonSprite_continue);

    deathPixi.buttonSprite_quit = new PIXI.Sprite(btnNormal);
    deathPixi.buttonSprite_quit.width = buttonWidth;
    deathPixi.buttonSprite_quit.height = buttonHeight;
    deathPixi.buttonSprite_quit.position.set(btnX, btnY_quit);
    deathPixi.buttonSprite_quit.eventMode = 'static';
    deathContainer.addChild(deathPixi.buttonSprite_quit);

    // 按钮文字
    const fontY_offset: number = 4;

    deathPixi.buttonText_continue = new PIXI.Text('', { ...genericTextStyle(), fontSize: 24, align: 'center' });
    deathPixi.buttonText_continue.anchor.set(0.5);
    deathPixi.buttonText_continue.position.set(btnX + buttonWidth / 2, btnY_continue + buttonHeight / 2 + fontY_offset);
    deathContainer.addChild(deathPixi.buttonText_continue);

    deathPixi.buttonText_quit = new PIXI.Text('', { ...genericTextStyle(), fontSize: 24, align: 'center' });
    deathPixi.buttonText_quit.anchor.set(0.5);
    deathPixi.buttonText_quit.position.set(btnX + buttonWidth / 2, btnY_quit + buttonHeight / 2 + fontY_offset);
    deathContainer.addChild(deathPixi.buttonText_quit);

    // 鼠标悬停切换纹理
    deathPixi.buttonSprite_continue.on('mouseover', (): void => { deathPixi.buttonSprite_continue.texture = btnHover; });
    deathPixi.buttonSprite_continue.on('mouseout', (): void => { deathPixi.buttonSprite_continue.texture = btnNormal; });
    deathPixi.buttonSprite_quit.on('mouseover', (): void => { deathPixi.buttonSprite_quit.texture = btnHover; });
    deathPixi.buttonSprite_quit.on('mouseout', (): void => { deathPixi.buttonSprite_quit.texture = btnNormal; });

    // 点击复活
    deathPixi.buttonSprite_continue.on('click', (): void => {
        if (player.hp <= 0) {
            player.hp = 20;
            player.initXY();
            uistate.deathUI_isOpening = false;
            deathContainer.visible = uistate.deathUI_isOpening;
        }
    });

    // 点击返回标题界面
    deathPixi.buttonSprite_quit.on('click', (): void => {
        quitGame();
    });

    deathPixi.deathInitialized = true;
}

export function drawDeadPage(): void {
    if (player.hp <= 0 && gui_isDrawing) {
        initDeathUI();
        uistate.deathUI_isOpening = true;
        deathContainer.visible = uistate.deathUI_isOpening;
        // 更新文字（国际化）
        deathPixi.titleText.text = death.str[0] || '';
        deathPixi.buttonText_continue.text = death.str[1] || '';
        deathPixi.buttonText_quit.text = death.str[2] || '';
        // 按钮点击逻辑已绑定
    } else {
        uistate.deathUI_isOpening = false;
        deathContainer.visible = uistate.deathUI_isOpening;
    }
}

function main(): void {
    uistate.deathUI_isOpening = false;
    deathContainer.visible = uistate.deathUI_isOpening;
    deathContainer.zIndex = 4;

    // 如果 i18n 在 death.ts 执行前已经加载完成，则立即更新
    if ((apiObjects.win as any).t) {
        updateDeathTexts();
    }
}
main();
