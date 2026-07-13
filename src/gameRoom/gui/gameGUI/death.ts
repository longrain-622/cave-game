import { player } from "../../player.js";
import { point_coll_rect } from "../../const.js";
import { mouse } from "../../mouse.js";
import { ctx_gui, gui_isDrawing, canvas_gui, drawText, img_gui } from "./inventory.js";
import { apiObjects } from "../../../apiox/dom.js";
import { apioxEvent } from "../../../apiox/event.js";

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

function drawButton(text: string, x: number, y: number) {
    const button_width = 640; //px
    const button_height = button_width / 10;
    const font_size = 32;

    if(point_coll_rect(mouse.x, mouse.y, x, y, button_width, button_height)) { //检测鼠标的聚焦
        ctx_gui.drawImage(img_gui.widgets, 0, 86, 200, 20, x, y, button_width, button_height);
        if(death.click) { //复活
            death.click = false;
            player.hp = 20;
            player.initXY();
        }
    }
    else {
        ctx_gui.drawImage(img_gui.widgets, 0, 66, 200, 20, x, y, button_width, button_height);
    }

    drawText(text, x + button_width/2 - text.length*font_size/2, y + (button_height + font_size) / 2, font_size);
}

function drawDeadPage() {
    if(player.hp <= 0 && gui_isDrawing) {
        ctx_gui.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx_gui.fillRect(0, 0, canvas_gui.width, canvas_gui.height);

        drawText(death.str[0], canvas_gui.width / 2 - 96, canvas_gui.height * 0.25, 64);
        drawButton(death.str[1], 320, 320);
    }
}

export { drawDeadPage };
