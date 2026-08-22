import * as PIXI from 'pixi.js';
import { genericTextStyle } from '../../rendering/rendering.js';
import { getSetting } from '../../../constants/settingConfig.js';
import { apioxEvent } from '../../../apiox/event.js';

interface TouchButton {
    anchor_x: number; anchor_y: number;
    key: string; //按下时触发的键盘或鼠标
    visible: boolean;
    size: number; //大小 = size * 32
}

const defaultTouchButton: TouchButton = {
    anchor_x: 0, anchor_y: 0,
    key: '',
    visible: true,
    size: 2,
};

function newTouchButton(overrides: Partial<TouchButton>): TouchButton {
    return { ...defaultTouchButton, ...overrides };
}

let TouchButton_added: TouchButton[] = [];

export function initTouchButtons(app: PIXI.Application) {
    const { width, height } = app.screen;

    TouchButton_added.forEach(btn => {
        if (!btn.visible) {return;}

        const sizePx: number = btn.size * 32;
        const margin: number = 10;
        let x: number = btn.anchor_x * width - sizePx / 2;
        let y: number = btn.anchor_y * height - sizePx / 2;
        x = Math.max(margin, Math.min(width - sizePx - margin, x));
        y = Math.max(margin, Math.min(height - sizePx - margin, y));

        const container: PIXI.Container = new PIXI.Container();
        container.x = x;
        container.y = y;
        container.zIndex = 3;
        container.hitArea = new PIXI.Rectangle(0, 0, sizePx, sizePx);
        container.eventMode = 'static';
        container.cursor = 'pointer';

        //背景
        const bg: PIXI.Graphics = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.5);
        bg.lineStyle(2, 0xffffff, 1);
        bg.drawRect(0, 0, sizePx, sizePx);
        bg.endFill();
        container.addChild(bg);

        //添加遮罩层（按下时显示，以改变背景外观）
        const overlay: PIXI.Graphics = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.3);
        overlay.drawRect(0, 0, sizePx, sizePx);
        overlay.endFill();
        overlay.visible = false; //默认隐藏
        container.addChild(overlay); //放在文字之前

        //文字
        const text: PIXI.Text = new PIXI.Text(btn.key.toUpperCase(), genericTextStyle());
        text.style.fontSize = 40;
        text.anchor.set(0.5);
        text.x = sizePx / 2;
        text.y = sizePx / 2;
        container.addChild(text);

        //事件绑定（使用 Event 类型）
        const eventOptions = {
            key: btn.key,
            code: 'Key' + btn.key.toUpperCase(),
            keyCode: btn.key.toUpperCase().charCodeAt(0),
            which: btn.key.toUpperCase().charCodeAt(0),
            bubbles: true,
            cancelable: true,
            composed: true,
        };

        const onPointerDown = (e: PIXI.FederatedPointerEvent): void => {
            e.stopPropagation();
            e.preventDefault();
            overlay.visible = true;
            apioxEvent.dispatchKeyboard('keydown', btn.key, eventOptions);
        };

        const onPointerUp = (e: PIXI.FederatedPointerEvent): void => {
            e.stopPropagation();
            e.preventDefault();
            overlay.visible = false;
            apioxEvent.dispatchKeyboard('keyup', btn.key, eventOptions);
        };

        container.on('pointerdown', onPointerDown);
        container.on('pointerup', onPointerUp);
        container.on('pointerupoutside', onPointerUp);

        app.stage.addChild(container);
    });
}

function mobileTouchMain(): void {
    if (getSetting().phoneButton_isOpening) {
        TouchButton_added.push(newTouchButton({ anchor_x: 0, anchor_y: 0.7, key: 'a', size: 3 }));
        TouchButton_added.push(newTouchButton({ anchor_x: 0.20, anchor_y: 0.7, key: 'd', size: 3 }));
        TouchButton_added.push(newTouchButton({ anchor_x: 1, anchor_y: 0.7, key: 'w', size: 3 }));
    } else {
        TouchButton_added = [];
    }
}
mobileTouchMain();