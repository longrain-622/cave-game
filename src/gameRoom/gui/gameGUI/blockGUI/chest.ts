import { Slots } from '../inventoryConfig.js';
import { world, blockTypeAt } from '../../../world.js';
import { getRandomInt } from '../../../const.js';
import { idOfBlock } from '../../../nature/blockMecha/blocks.js';
import { createDrop } from '../../../dropped/droppedItem.js';
import { coverWhenSave, readingWorld } from '../../../gameState.js';
import { uistate } from '../../uiState.js';
import { handleBackpackClick, handleBackpackContextMenu, setSelectedIndex } from '../inventory.js';

export interface Chest { // 记录每个箱子的信息
    world_x: number; world_y: number;
    fold: Slots[]; // 所装物品
}
export let chests: Chest[] = [];

// 初始化（读档）箱子数组
function loadChest(): void {
    if (coverWhenSave && readingWorld !== null) {
        for (let i = 0; i < readingWorld.chests.length; i++) {
            const readChest = readingWorld.chests[i];

            let fold: Slots[] = [];
            for (let k = 0; k < readChest.fold.length; k++) {
                const readChestSlot = readChest.fold[k];
                const putChestSlot = new Slots(readChestSlot.item, readChestSlot.num, readChestSlot.durability);
                fold.push(putChestSlot);
            }

            const putChest: Chest = {
                world_x: readChest.world_x,
                world_y: readChest.world_y,
                fold: fold,
            };

            chests.push(putChest);
        }
    }
}

export function lookChest(look_x: number, look_y: number): Chest {
    for (let i = chests.length - 1; i >= 0; i--) {
        const cst: Chest = chests[i];
        if (!world[cst.world_y] || blockTypeAt(cst.world_x, cst.world_y) !== idOfBlock.chest) {
            chests.splice(i, 1); // 清除无用的箱子对象
        }
    }

    // 检查或补漏箱子对象
    let existing = chests.find(c => c.world_x === look_x && c.world_y === look_y);
    if (!existing) {
        existing = {
            world_x: look_x,
            world_y: look_y,
            fold: Array.from({ length: 27 }, () => new Slots(-1, 0)) // 27个空槽
        };
        chests.push(existing);
    }
    return existing;
}

// 移除箱子并把内容物掉落到世界中
export function removeChestAt(chest_world_x: number, chest_world_y: number): void {
    if (blockTypeAt(chest_world_x, chest_world_y) !== idOfBlock.chest || chests.length === 0) {return;}

    const target = chests.find(obj => (obj.world_x === chest_world_x && obj.world_y === chest_world_y));
    if (!target) {return;}
    chests.splice(chests.indexOf(target), 1);

    for (let i = 0; i < target.fold.length; i++) {
        if (target.fold[i].item === -1) {continue;}
        for (let k = 0; k < target.fold[i].num; k++) {
            createDrop(target.fold[i].item, chest_world_x * 64 + getRandomInt(0, 64), chest_world_y * 64 + getRandomInt(0, 64));
        }
    }
}

// 当前打开的箱子
let currentChest: Chest | null = null;
// 箱子槽位与背包槽位的悬停索引（由渲染层每帧写入）
export let chestSelectedIndex: number = -1;
export let chestBackpackSelectedIndex: number = -1;

export function setCurrentChest(world_x: number, world_y: number): void {
    currentChest = lookChest(world_x, world_y);
}

export function clearCurrentChest(): void {
    currentChest = null;
}

export function getCurrentChest(): Chest | null {
    return currentChest;
}

export function setChestSelectedIndex(newVal: number): void {
    chestSelectedIndex = newVal;
}

export function setChestBackpackSelectedIndex(newVal: number): void {
    chestBackpackSelectedIndex = newVal;
}

export function getChestSelectedIndex(): number {
    return chestSelectedIndex;
}

export function getBackpackSelectedIndex(): number {
    return chestBackpackSelectedIndex;
}

// 交互处理函数
export function handleChestClick(selecting: Slots): void {
    if (chestSelectedIndex === -1 || !currentChest) {return;}
    const target = currentChest.fold[chestSelectedIndex];
    const mouseHas = (selecting.item !== -1);
    const targetHas = (target.item !== -1);

    if (!mouseHas && targetHas) {
        selecting.item = target.item;
        selecting.num = target.num;
        target.item = -1;
        target.num = 0;
        return;
    }
    if (mouseHas && !targetHas) {
        target.item = selecting.item;
        target.num = selecting.num;
        selecting.item = -1;
        selecting.num = 0;
        return;
    }
    if (mouseHas && targetHas) {
        if (selecting.item === target.item && (selecting.num + target.num <= target.max)) {
            target.num += selecting.num;
            selecting.item = -1;
            selecting.num = 0;
        } else {
            const tmpItem = target.item, tmpNum = target.num;
            target.item = selecting.item;
            target.num = selecting.num;
            selecting.item = tmpItem;
            selecting.num = tmpNum;
        }
    }
}

export function handleChestContextMenu(selecting: Slots): void {
    if (chestSelectedIndex === -1 || !currentChest) {return;}
    const target = currentChest.fold[chestSelectedIndex];
    const mouseHas = (selecting.item !== -1);
    const targetHas = (target.item !== -1);

    if (!mouseHas && targetHas) {
        selecting.item = target.item;
        selecting.num = 1;
        target.num -= 1;
        if (target.num === 0) {target.item = -1;}
        return;
    }
    if (mouseHas) {
        if (!targetHas) {
            target.item = selecting.item;
            target.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) { selecting.item = -1; selecting.num = 0; }
        } else if (target.item === selecting.item && target.num < target.max) {
            target.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) { selecting.item = -1; selecting.num = 0; }
        }
    }
}

// 将背包点击委托给背包逻辑中的函数，但传入当前高亮索引
export function handleChestBackpackClick(): void {
    if (chestBackpackSelectedIndex !== -1) {
        setSelectedIndex(chestBackpackSelectedIndex);
        handleBackpackClick();
    }
}

export function handleChestBackpackContextMenu(): void {
    if (chestBackpackSelectedIndex !== -1) {
        setSelectedIndex(chestBackpackSelectedIndex);
        handleBackpackContextMenu();
    }
}

// 箱子被破坏时的处理
export function breakChest(chest_world_x: number, chest_world_y: number): void {
    if (blockTypeAt(chest_world_x, chest_world_y) !== idOfBlock.chest) {return;}

    //破坏箱子后关闭 GUI 状态
    if (uistate.chest_isOpening) {
        uistate.chest_isOpening = false;
        currentChest = null;
    }

    removeChestAt(chest_world_x, chest_world_y);
}

function main(): void {
    loadChest();
}
main();
