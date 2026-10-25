import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { world, blockTypeAt } from '../world.js';
import { getRandomInt } from '../const.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { createDrop } from '../dropped/droppedItem.js';
import { coverWhenSave, readingWorld } from '../gameState.js';

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

loadChest();
