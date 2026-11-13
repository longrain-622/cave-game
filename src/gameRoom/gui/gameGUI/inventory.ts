import { Slots } from './inventoryConfig.js';
import { craftingResultSlot, craftingSlots, updateCraftingResult, consumeCraftingMaterials } from './blockGUI/crafting.js';
import { recipes } from './blockGUI/craftingRecipe.js';
import { coverWhenSave, readingWorld } from '../../gameState.js';
import { room } from '../../../constants/generic.js';

interface Inventories {
    items: Slots[]; // 存储槽位对象的数组
    width: number; height: number; // 屏幕上绘制的宽高
    initSlots: (num: number) => void; // 初始化槽位
}

export const inventory: Inventories = {
    items: [],
    width: 704, height: 664,
    initSlots(num: number) {
        for (let i = 0; i < num; i++) {
            this.items.push(new Slots(-1, 0));
        }
    },
};

// 热键栏对象
interface Widgets {
    width: number; height: number;
    x: number; y: number;
    select: number;
}

export const widgets: Widgets = {
    width: 760, height: 88,
    x: 0, y: 0,
    select: 0
};

export function pickupObj(item: number): void { // 拾取物品
    let targetSlot: number = 0; // 找到空格
    while ((inventory.items[targetSlot].item !== -1 && inventory.items[targetSlot].item !== item)
    || inventory.items[targetSlot].num >= inventory.items[targetSlot].max) {
        targetSlot += 1;
        if (targetSlot >= inventory.items.length - 1) {return;}
    }

    inventory.items[targetSlot].item = item; // 拾取
    inventory.items[targetSlot].num += 1;
    return;
}

export let selecting: Slots = new Slots(-1, 0); // 正在选取中的物品（跟随鼠标）
export let selectedIndex: number = -1; // 背包中当前悬停的槽位索引

let selectedCraftingType: 'crafting' | 'result' | null = null;
let selectedCraftingIndex: number = -1;

export function setSelectedIndex(newVal: number): void {
    selectedIndex = newVal;
}

export function setCraftingSelection(type: 'crafting' | 'result', index: number): void {
    selectedCraftingType = type;
    selectedCraftingIndex = index;
}

// 每帧绘制前重置悬停状态
export function resetSlotSelection(): void {
    selectedIndex = -1;
    selectedCraftingType = null;
    selectedCraftingIndex = -1;
}

// 左键点击背包：优先处理合成区域，再处理背包槽位
export function handleInventorySlotClick(): void {
    if (selectedCraftingType !== null) { // 优先处理合成区域
        let targetSlot: Slots;
        if (selectedCraftingType === 'crafting') {
            targetSlot = craftingSlots[selectedCraftingIndex];
        } else {
            targetSlot = craftingResultSlot;
        }

        if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

        const mouseHasItem: boolean = (selecting.item !== -1);
        const targetHasItem: boolean = (targetSlot.item !== -1);

        // 鼠标空，目标有 -> 拿起
        if (!mouseHasItem && targetHasItem) {
            if (selectedCraftingType === 'result') {
                // 先记录结果槽的信息
                const outputId: number = targetSlot.item;
                const recipe = recipes.find(r => r.outputId === outputId);
                if (recipe) {
                    // 消耗原料（会内部更新结果槽）
                    const consumedTimes: number = consumeCraftingMaterials();
                    if (consumedTimes > 0) {
                        const takenCount: number = recipe.outputCount * consumedTimes;
                        selecting = new Slots(outputId, takenCount, targetSlot.max);
                    }
                }
            } else {
                // 普通合成槽或背包槽的处理
                selecting = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
                targetSlot.item = -1;
                targetSlot.num = 0;
                updateCraftingResult();
            }
            return;
        }
        // 鼠标有，目标空 -> 放下
        if (mouseHasItem && !targetHasItem) {
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting = new Slots(-1, 0);
            updateCraftingResult();
            return;
        }
        // 双方都有 -> 相同且可叠加则合并，否则交换
        if (mouseHasItem && targetHasItem) {
            if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
                targetSlot.num += selecting.num;
                selecting = new Slots(-1, 0);
            } else {
                const temp: Slots = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
                targetSlot.item = selecting.item;
                targetSlot.num = selecting.num;
                selecting = temp;
            }
            updateCraftingResult();
            return;
        }
        return;
    }

    if (selectedIndex === -1) {return;}

    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    // 双方都空 -> 无操作
    if (!mouseHasItem && !targetHasItem) {
        return;
    }

    // 鼠标空，目标有 -> 拿起
    if (!mouseHasItem && targetHasItem) {
        selecting = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
        targetSlot.item = -1;
        targetSlot.num = 0;
        return;
    }

    // 鼠标有，目标空 -> 放下
    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        selecting = new Slots(-1, 0);
        return;
    }

    // 双方都有物品
    if (mouseHasItem && targetHasItem) {
        // 物品相同且可以叠加（叠加后不超过目标上限）
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            // 合并到目标格子，清空鼠标
            targetSlot.num += selecting.num;
            selecting = new Slots(-1, 0);
        } else {
            // 物品不同 或 相同但叠加会超过上限 -> 交换
            const temp: Slots = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = temp.item;
            selecting.num = temp.num;
        }
    }
}

// 右键点击背包：优先处理合成区域，再处理背包槽位（每次转移 1 个）
export function handleInventorySlotContextMenu(): void {
    // 优先处理合成区域
    if (selectedCraftingType !== null) {
        let targetSlot: Slots;
        if (selectedCraftingType === 'crafting') {
            targetSlot = craftingSlots[selectedCraftingIndex];
        } else { // 'result'
            targetSlot = craftingResultSlot;
        }

        if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

        const mouseHasItem: boolean = (selecting.item !== -1);
        const targetHasItem: boolean = (targetSlot.item !== -1);

        // 鼠标上有物品，目标槽可放入单个（相同物品且未满，或目标空）
        if (mouseHasItem && (!targetHasItem || (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max))) {
            if (!targetHasItem) {
                targetSlot.item = selecting.item;
                targetSlot.num = 1;
            } else {
                targetSlot.num += 1;
            }
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
            updateCraftingResult();
            return;
        }

        // 鼠标空，目标有物品 -> 拿起1个
        if (!mouseHasItem && targetHasItem) {
            if (selectedCraftingType === 'result') {
                const outputId: number = targetSlot.item;
                const recipe = recipes.find(r => r.outputId === outputId); // 找到对应的配方，获取单次产出数量
                if (recipe && targetSlot.num >= recipe.outputCount) {
                    const consumed: number = consumeCraftingMaterials(1);
                    if (consumed === 1) {
                        // 更新鼠标上的物品（拿取一份产物）
                        selecting = new Slots(outputId, recipe.outputCount, targetSlot.max);
                    }
                }
                return;
            } else {
                selecting = new Slots(targetSlot.item, 1, targetSlot.max);
                targetSlot.num -= 1;
                if (targetSlot.num === 0) {
                    targetSlot.item = -1;
                }
                updateCraftingResult();
            }
            return;
        }

        return;
    }

    if (selectedIndex === -1) {return;}

    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    // 鼠标空，目标有物品 -> 拿起1个
    if (!mouseHasItem && targetHasItem) {
        selecting = new Slots(targetSlot.item, 1, targetSlot.max);
        targetSlot.num -= 1;
        if (targetSlot.num === 0) {
            targetSlot.item = -1;
        }
        return;
    }

    // 鼠标有物品，尝试放入1个
    if (mouseHasItem) {
        // 目标格子为空 -> 放入一个
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
        }
        // 目标格子物品相同且未满 -> 增加一个
        else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
        }
    }
}

// 背包左键点击逻辑（供箱子/熔炉/工作台界面的背包区域复用）
export function handleBackpackClick(): void {
    if (selectedIndex === -1) {return;}
    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    if (!mouseHasItem && !targetHasItem) {return;}

    if (!mouseHasItem && targetHasItem) {
        selecting.item = targetSlot.item;
        selecting.num = targetSlot.num;
        targetSlot.item = -1;
        targetSlot.num = 0;
        return;
    }

    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        selecting.item = -1;
        selecting.num = 0;
        return;
    }

    if (mouseHasItem && targetHasItem) {
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            targetSlot.num += selecting.num;
            selecting.item = -1;
            selecting.num = 0;
        } else {
            const tempItem: number = targetSlot.item, tempNum: number = targetSlot.num;
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = tempItem;
            selecting.num = tempNum;
        }
    }
}

// 背包右键点击逻辑（供箱子/熔炉/工作台界面的背包区域复用）
export function handleBackpackContextMenu(): void {
    if (selectedIndex === -1) {return;}
    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    if (!mouseHasItem && targetHasItem) {
        selecting.item = targetSlot.item;
        selecting.num = 1;
        targetSlot.num -= 1;
        if (targetSlot.num === 0) {targetSlot.item = -1;}
        return;
    }

    if (mouseHasItem) {
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
        } else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
        }
    }
}

// 槽位几何与命中测试（纯函数，逻辑层与渲染层共用）。

function main(): void {
    // 物品栏位置
    widgets.x = (room.width - widgets.width) / 2;
    widgets.y = room.height - widgets.height;

    // 初始化背包
    if (coverWhenSave && readingWorld !== null) {
        for (let i = 0; i < readingWorld.inventory.items.length; i++) {
            const readSlot = readingWorld.inventory.items[i];
            const putSlot = new Slots(readSlot.item, readSlot.num, readSlot.durability);
            inventory.items.push(putSlot);
        }
        while (inventory.items.length < 36) {
            inventory.initSlots(1);
        }
    } else {
        inventory.initSlots(36);
    }
}
main();
