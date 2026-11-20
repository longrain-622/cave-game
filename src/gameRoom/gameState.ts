import { WorldArchive } from "../types/worldArchive.js";

export let readingWorld: WorldArchive | null = null;
export let coverWhenSave: boolean = false;

export function setReadingWorld(val: WorldArchive) {
    readingWorld = val;
    if (readingWorld !== null) {
        coverWhenSave = true;
    }
}

interface EventBusSwitch {
    itemPickup: number;
    playerHurt: number;
    playerFallinWater: number;
    blockBreak: number[]; // 本帧被破坏的方块类型，按发生顺序排队，由事件层统一转成 eventBus 事件
}

export const eventBusSwitch: EventBusSwitch = { // 所有需要使用 EventBus 的逻辑层，不需要导入 eventBus.ts，只需要修改这个对象的属性即可
    itemPickup: 0,
    playerHurt: 0,
    playerFallinWater: 0,
    blockBreak: [],
};