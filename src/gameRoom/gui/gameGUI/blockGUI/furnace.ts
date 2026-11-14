// furnace.ts
// 熔炉容器状态与熔炉界面的纯逻辑（槽位点击/破坏处理）。
import { Slots } from '../inventoryConfig.js';
import { world, blockTypeAt } from '../../../world.js';
import { point_coll_rect } from '../../../math.js';
import { readingWorld, coverWhenSave } from '../../../gameState.js';
import { WorldArchive, FurnaceArchive } from '../../../../types/worldArchive.js';
import { player } from '../../../player.js';
import { idOfBlock } from '../../../nature/blockMecha/blocks.js';
import { createDrop } from '../../../dropped/droppedItem.js';
import { getRandomInt, notNullUndefined } from '../../../../constants/utils.js';
import { uistate } from '../../uiState.js';
import { getFurnaceRecipe, FurnaceRecipe, fuels } from './furnaceRecipe.js';
import { handleBackpackClick, handleBackpackContextMenu, setSelectedIndex } from '../inventory.js';

export interface Furnace {
    world_x: number; world_y: number;
    fuel: Slots;
    input: Slots;
    output: Slots;
    fuelProgress: number; // 燃料燃烧的进度
    outputProgress: number;
}
export const furnaceArray: Furnace[] = [];
const lookRange: number = 32 * 64; // 最大处理距离，超过此值的实例跳过，单位：px

// 加载存档中的所有熔炉
function loadFurnace(readWorld: WorldArchive | null): void {
    if (!(coverWhenSave && notNullUndefined(readWorld))) {return;}
    if (!notNullUndefined(readWorld.furnaces)) {
        console.log('cannot load the furnaces of your world!');
        return;
    }

    for (let f = 0; f < readWorld.furnaces.length; f++) {
        const readFurnace: FurnaceArchive = readWorld.furnaces[f];
        const input = new Slots(readFurnace.input.item, readFurnace.input.num, readFurnace.input.durability);
        const output = new Slots(readFurnace.output.item, readFurnace.output.num, readFurnace.output.durability);
        const fuel = new Slots(readFurnace.fuel.item, readFurnace.fuel.num, readFurnace.fuel.durability);

        const addFurnace: Furnace = {
            world_x: readFurnace.world_x, world_y: readFurnace.world_y,
            fuel: fuel,
            input: input,
            output: output,
            fuelProgress: readFurnace.fuelProgress,
            outputProgress: readFurnace.outputProgress,
        };

        furnaceArray.push(addFurnace);
    }
}

export function lookFurnace(look_x: number, look_y: number): Furnace {
    for (let i = furnaceArray.length - 1; i >= 0; i--) {
        const fur: Furnace = furnaceArray[i];
        if (!world[fur.world_y] || blockTypeAt(fur.world_x, fur.world_y) !== idOfBlock.furnace) {
            furnaceArray.splice(i, 1); // 清除无用的熔炉对象
        }
    }

    // 查找或补漏某个位置的熔炉对象
    let existing = furnaceArray.find(f => f.world_x === look_x && f.world_y === look_y);
    if (!existing) {
        existing = {
            world_x: look_x,
            world_y: look_y,
            input: new Slots(-1, 0),
            output: new Slots(-1, 0),
            fuel: new Slots(-1, 0),
            fuelProgress: 0,
            outputProgress: 0,
        };
        furnaceArray.push(existing);
    }
    return existing;
}

// 烧制物品
// 当有熔炉处于正在使用的状态时，每帧执行一次
function firingItem(whichFurnace: Furnace, delta: number): void {
    const recipe: FurnaceRecipe | undefined = getFurnaceRecipe(whichFurnace.input.item);
    if (!recipe) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
        return;
    }

    if (whichFurnace.output.item !== idOfBlock.air) {
        if (whichFurnace.output.item !== recipe.output) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
            return;
        }
        if (whichFurnace.output.num >= whichFurnace.output.max) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
            return;
        }
    }

    if (!fuels.includes(whichFurnace.fuel.item)) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
        return;
    }

    whichFurnace.outputProgress += delta;
    whichFurnace.fuelProgress += delta;

    if (whichFurnace.outputProgress >= recipe.time) {
        whichFurnace.input.num--;
        if (whichFurnace.input.num <= 0) {
            whichFurnace.input.item = idOfBlock.air;
            whichFurnace.input.num = 0;
        }

        if (whichFurnace.output.item === -1) {
            whichFurnace.output.item = recipe.output;
            whichFurnace.output.num = 1;
            whichFurnace.output.durability = -1;
        } else {
            whichFurnace.output.num++;
        }
        whichFurnace.outputProgress = 0;
    }

    if (whichFurnace.fuelProgress >= 512) {
        whichFurnace.fuelProgress = 0;
        whichFurnace.fuel.num--;

        if (whichFurnace.fuel.num <= 0) {
            whichFurnace.fuel.item = idOfBlock.air;
            whichFurnace.fuel.num = 0;
        }
    }
}

// 每帧处理所有熔炉的烧制
export function furnaceLoop(delta: number): void {
    for (let i = 0; i < furnaceArray.length; i++) {
        if (
            !point_coll_rect(
                furnaceArray[i].world_x * 64,
                furnaceArray[i].world_y * 64,
                player.x - lookRange / 2,
                player.y - lookRange / 2,
                lookRange, lookRange
            )
        ) {
            continue; // 超出玩家视野范围的熔炉跳过，继续处理其余熔炉
        }
        firingItem(furnaceArray[i], delta);
    }
}

// 移除熔炉并把内容物掉落到世界中
export function removeFurnaceAt(furnace_world_x: number, furnace_world_y: number): void {
    if (blockTypeAt(furnace_world_x, furnace_world_y) !== idOfBlock.furnace || furnaceArray.length === 0) {return;}

    const target: Furnace | undefined = furnaceArray.find(
        obj => (obj.world_x === furnace_world_x && obj.world_y === furnace_world_y)
    );
    if (!target) {return;}
    furnaceArray.splice(furnaceArray.indexOf(target), 1);

    const allSlots: Slots[] = [target.input, target.output, target.fuel];
    for (let i = 0; i < allSlots.length; i++) {
        if (allSlots[i].item === -1) {continue;}
        for (let k = 0; k < allSlots[i].num; k++) {
            createDrop(
                allSlots[i].item,
                furnace_world_x * 64 + getRandomInt(0, 64),
                furnace_world_y * 64 + getRandomInt(0, 64)
            );
        }
    }
}

// 熔炉界面的槽位编号
export enum furnaceSlotNumber {
    input, output, fuel
}

// 当前打开的熔炉与悬停索引（索引由渲染层每帧写入）
let currentFurnace: Furnace | null = null;
export let furnaceSelectedIndex: number = -1;
export let furnaceBackpackSelectedIndex: number = -1;

export function setCurrentFurnace(world_x: number, world_y: number): void {
    currentFurnace = lookFurnace(world_x, world_y);
}

export function clearCurrentFurnace(): void {
    currentFurnace = null;
}

export function getCurrentFurnace(): Furnace | null {
    return currentFurnace;
}

export function setFurnaceSelectedIndex(newVal: number): void {
    furnaceSelectedIndex = newVal;
}

export function setFurnaceBackpackSelectedIndex(newVal: number): void {
    furnaceBackpackSelectedIndex = newVal;
}

// 交互处理函数
export function handleFurnaceClick(selecting: Slots): void {
    if (furnaceSelectedIndex === -1 || !currentFurnace) {return;}
    let target: Slots;
    switch (furnaceSelectedIndex) {
        case furnaceSlotNumber.input: target = currentFurnace.input; break;
        case furnaceSlotNumber.output: target = currentFurnace.output; break;
        case furnaceSlotNumber.fuel: target = currentFurnace.fuel; break;
        default: return;
    }

    // 输出槽只能拿物品，不能放
    if (furnaceSelectedIndex === furnaceSlotNumber.output) {
        if (selecting.item === -1 && target.item !== -1) {
            selecting.item = target.item;
            selecting.num = target.num;
            target.item = -1;
            target.num = 0;
        }
        return;
    }

    const mouseHas: boolean = (selecting.item !== -1);
    const targetHas: boolean = (target.item !== -1);

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

    // 玩家改变了输入槽的物品，重置烧制进度，避免进度被新物品继承
    if (furnaceSelectedIndex === furnaceSlotNumber.input) {
        currentFurnace.outputProgress = 0;
    }
}

export function handleFurnaceContextMenu(selecting: Slots): void {
    if (furnaceSelectedIndex === -1 || !currentFurnace) {return;}
    let target: Slots;
    switch (furnaceSelectedIndex) {
        case furnaceSlotNumber.input: target = currentFurnace.input; break;
        case furnaceSlotNumber.output: target = currentFurnace.output; break;
        case furnaceSlotNumber.fuel: target = currentFurnace.fuel; break;
        default: return;
    }

    // 输出槽只能拿物品，不能放
    if (furnaceSelectedIndex === furnaceSlotNumber.output) {
        if (selecting.item === -1 && target.item !== -1) {
            selecting.item = target.item;
            selecting.num = 1;
            target.num -= 1;
            if (target.num === 0) {target.item = -1;}
        }
        return;
    }

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

    // 玩家改变了输入槽的物品，重置烧制进度，避免进度被新物品继承
    if (furnaceSelectedIndex === furnaceSlotNumber.input) {
        currentFurnace.outputProgress = 0;
    }
}

// 导出熔炉索引与交互函数（供 inventory 使用）
export function getFurnaceSelectedIndex(): number {
    return furnaceSelectedIndex;
}

export function getFurnaceBackpackSelectedIndex(): number {
    return furnaceBackpackSelectedIndex;
}

// 将背包点击委托给背包逻辑中的函数，但传入当前高亮索引
export function handleFurnaceBackpackClick(): void {
    if (furnaceBackpackSelectedIndex !== -1) {
        setSelectedIndex(furnaceBackpackSelectedIndex);
        handleBackpackClick();
    }
}

export function handleFurnaceBackpackContextMenu(): void {
    if (furnaceBackpackSelectedIndex !== -1) {
        setSelectedIndex(furnaceBackpackSelectedIndex);
        handleBackpackContextMenu();
    }
}

// 熔炉被破坏时的处理
export function breakFurnace(furnace_world_x: number, furnace_world_y: number): void {
    if (blockTypeAt(furnace_world_x, furnace_world_y) !== idOfBlock.furnace) {return;}

    // 破坏熔炉后关闭 GUI 状态
    if (uistate.furnace_isOpening) {
        uistate.furnace_isOpening = false;
        currentFurnace = null;
    }

    removeFurnaceAt(furnace_world_x, furnace_world_y);
}

function main(): void {
    loadFurnace(readingWorld);
}
main();
