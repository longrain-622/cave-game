import { apioxTime } from "../apiox/time.js";
import { apioxEvent, ApioxKeyboardEvent, apioxEventBus } from "../apiox/event.js";
import { ApioxObject } from "../apiox/dom.js";

//世界的属性等
const world_height: number = 256;
const worldNameInput = new ApioxObject('worldNameInput');
const worldName: string = worldNameInput.getProperty('value');

const room: {
    width: number; height: number
} = {
    width: 1280, height: 720,
    //1280*720px
}

const chunk: {
    width: number; start_x: number;
    num: number; lookRange: number;
    left_number: number;
} = {
    width: 16, start_x: 0,
    num: 0, lookRange: 32, //渲染范围
    left_number: 0, //左侧区块数量
}

let world: number[][] = Array.from({ length: world_height }, (): number[] => []);
const sealevel: number = world_height / 2;

//生成随机数
function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//检测点与对象的碰撞
function place_meeting(x: number, y: number): boolean {
    if(world[Math.floor(y / 64)][Math.floor(x / 64)] >= 0) {return true;}
    else {return false;}
}

//检测点和矩形的碰撞
function point_coll_rect(x: number, y: number, rect_x: number, rect_y: number, width: number, height: number): boolean {
    if(x >= rect_x && x <= rect_x + width && y >= rect_y && y <= rect_y + height) {
        return true;
    }
    else {
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
        unsubscribe(); //移除键盘监听
        if (resetTimer) {
            apioxTime.clearOut(resetTimer);
            resetTimer = null;
        }
    };
}

function distance(x1: number, y1: number, x2: number, y2: number): number { //获得两点间距离
    const dx: number = x1 - x2;
    const dy: number = y1 - y2;
    return Math.hypot(dx, dy);
}

function isOnScreen(x: number, y: number, width: number, height: number): boolean {
    if(x >= -width && y >= -height && x <= room.width + width && y <= room.height + height) {
        return true;
    } else {
        return false;
    }
}

function isOutOfBounds(row: number, col: number): boolean { //y, x
    if (row < 0 || row >= world_height) {return true;}
    const rowLen: number = world[row]?.length ?? 0;
    return col < 0 || col >= rowLen;
}

function setMyVariable(type: 0, newValue: number[][]): void;
function setMyVariable(type: 2, newValue: boolean): void;
function setMyVariable(type: 3, newValue: boolean): void;
function setMyVariable(type: number, newValue: number[][] | boolean): void {
    switch(type) {
        case 0: world = newValue as number[][]; break;
        /*
        case 1: world[0].length = newValue; break;
        case 2: setting.phoneButton_isOpening = newValue as boolean; break;
        case 3: setting.screenRotate_isOpening = newValue as boolean; break;
        */
    }
}

function pushChunkToWorld(chunkArray: number[][], behind: boolean): void {
    const expectedLen: number = chunk.num * chunk.width;

    for (let i = 0; i < world_height; i++) {
        //截断污染：如果该行长度超过预期，说明被越界写入过
        if (world[i].length > expectedLen) {
            world[i].length = expectedLen;
        }

        if (behind) {
            world[i].push(...chunkArray[i]);
        } else {
            world[i].unshift(...chunkArray[i]);
        }
    }
}

export { world_height, room, world, sealevel, chunk, worldName };
export { getRandomInt, place_meeting, enableKeyDoubleClickDetection, point_coll_rect, distance, isOutOfBounds, setMyVariable, pushChunkToWorld, isOnScreen };
