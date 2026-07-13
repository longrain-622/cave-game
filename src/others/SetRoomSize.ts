import { room } from "../gameRoom/const.js";
import { content, gameRoom } from "../contentRoom/content.js";
import { win } from "../apiox/global.js";
import { apioxEvent } from "../apiox/event.js";

function scaleContent(): void {
    const scaleX = win.inWidth / room.width;
    const scaleY = win.inHeight / room.height;
    const scale = Math.min(scaleX, scaleY);

    content.domstyle({
        'transform': `scale(${scale})`,
        'transform-origin': '0 0',
        'left': `${(win.inWidth - room.width * scale) / 2}px`, 'top': '0'
    });
}

function scaleGame(): void {
    // 计算宽度比例和高度比例，取最小值确保完整显示
    const scaleX = win.inWidth / room.width;
    const scaleY = win.inHeight / room.height;
    const scale = Math.min(scaleX, scaleY);  // 等比缩放，可能会有黑边

    // 应用缩放，同时利用 transform-origin 保持从左上角缩放
    gameRoom.domstyle({
        'transform': `scale(${scale})`,
        'transform-origin': '0 0',
        'left': `${(win.inWidth - room.width * scale) / 2}px`, 'top': '0'
    });
}

// 初始执行
scaleGame(); scaleContent();
// 监听窗口变化
apioxEvent.listenWindow('resize', function(){scaleGame(); scaleContent();});
