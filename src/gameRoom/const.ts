import { apioxTime } from "../apiox/time.js";
import { apioxEvent, ApioxKeyboardEvent, apioxEventBus } from "../apiox/event.js";
import { room } from "../constants/generic.js";

// 生成随机数
function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 检测点和矩形的碰撞
function point_coll_rect(x: number, y: number, rect_x: number, rect_y: number, width: number, height: number): boolean {
    if (x >= rect_x && x <= rect_x + width && y >= rect_y && y <= rect_y + height) {
        return true;
    } else {
        return false;
    }
}

/**
 * 启用按键双击检测 apiox.js
 * @param delay 双击判定间隔（毫秒），默认 300ms
 * @returns 清理函数，用于移除事件监听和定时器
 */
function enableKeyDoubleClickDetection(delay = 300): () => void {
    let lastKey: string | null = null;
    let lastTime: number = 0;
    let resetTimer: number | null = null;

    // 键盘监听回调（接收包装后的 ApioxKeyboardEvent）
    const onKeyDown = (e: ApioxKeyboardEvent) => {
        // 忽略长按重复触发的按键
        if (e.repeat) {
            return;
        }

        const currentKey: string = e.key;
        const currentTime: number = Date.now();

        if (currentKey === lastKey && (currentTime - lastTime) < delay) {
            // 通过 apiox 事件总线派发自定义事件（不接触原生 CustomEvent）
            apioxEventBus.emit('keydoubleclick', { key: currentKey });

            // 重置状态，避免连续触发
            lastKey = null;
            lastTime = 0;
            if (resetTimer) {
                apioxTime.clearOut(resetTimer);
                resetTimer = null;
            }
        } else {
            lastKey = currentKey;
            lastTime = currentTime;

            // 重置记忆超时
            if (resetTimer) {
                apioxTime.clearOut(resetTimer);
            }
            resetTimer = apioxTime.setOut(() => {
                lastKey = null;
                lastTime = 0;
                resetTimer = null;
            }, delay);
        }
    };

    // 注册键盘监听（apioxEvent.onKeyDown 会自动包装原生事件）
    const unsubscribe = apioxEvent.onKeyDown(onKeyDown);

    // 返回统一的清理函数
    return () => {
        unsubscribe(); // 移除键盘监听
        if (resetTimer) {
            apioxTime.clearOut(resetTimer);
            resetTimer = null;
        }
    };
}

function distance(x1: number, y1: number, x2: number, y2: number): number { // 获得两点间距离
    const dx: number = x1 - x2;
    const dy: number = y1 - y2;
    return Math.hypot(dx, dy);
}

function isOnScreen(x: number, y: number, width: number, height: number): boolean {
    if (x >= -width && y >= -height && x <= room.width + width && y <= room.height + height) {
        return true;
    } else {
        return false;
    }
}

export { getRandomInt, point_coll_rect, enableKeyDoubleClickDetection, distance, isOnScreen };
