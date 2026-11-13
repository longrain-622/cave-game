import { Slots } from "../inventoryConfig.js";
import { selecting } from "../inventory.js";
import { updateResultForGrid, consumeFromGrid } from "./crafting.js";
import { recipes } from "./craftingRecipe.js";

const WORKBENCH_COLS: number = 3;
const WORKBENCH_ROWS: number = 3;

// 工作台的合成网格（3x3）和输出槽
export const workbenchSlots: Slots[] = [];
export const workbenchResultSlot: Slots = new Slots(-1, 0);

// 工作台高亮相关（由渲染层每帧写入）
export let selectedWbType: 'crafting' | 'result' | null = null;
export let selectedWbIndex: number = -1;

export function setWorkbenchSelection(type: 'crafting' | 'result' | null, index: number): void {
    selectedWbType = type;
    selectedWbIndex = index;
}

function updateWorkbenchResult(): void { // 更新工作台合成结果
    updateResultForGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS);
}

export function handleWorkbenchClick(): void {
    if (selectedWbType === null) {return;}

    // 重要：如果选中输出槽且鼠标上已有物品，则禁止任何操作（与背包合成行为一致）
    if (selectedWbType === 'result' && selecting.item !== -1) {
        return;
    }

    let targetSlot: Slots;
    if (selectedWbType === 'crafting') {
        targetSlot = workbenchSlots[selectedWbIndex];
    } else {
        targetSlot = workbenchResultSlot;
    }

    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 鼠标空，目标有 -> 拿起
    if (!mouseHasItem && targetHasItem) {
        if (selectedWbType === 'result') {
            const outputId = targetSlot.item;
            const recipe = recipes.find(r => r.outputId === outputId);
            if (recipe) {
                const consumed = consumeFromGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS);
                if (consumed > 0) {
                    const takenCount = recipe.outputCount * consumed;
                    // 修改 selecting 的内部属性，而不是重新赋值
                    selecting.item = outputId;
                    selecting.num = takenCount;
                }
            }
        } else {
            // 拿起普通合成槽物品
            selecting.item = targetSlot.item;
            selecting.num = targetSlot.num;
            targetSlot.item = -1;
            targetSlot.num = 0;
            updateWorkbenchResult();
        }
        return;
    }

    // 鼠标有，目标空 -> 放下
    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        // 清空 selecting 内部属性
        selecting.item = -1;
        selecting.num = 0;
        updateWorkbenchResult();
        return;
    }

    // 双方都有 -> 相同且可叠加则合并，否则交换
    if (mouseHasItem && targetHasItem) {
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            targetSlot.num += selecting.num;
            // 清空 selecting
            selecting.item = -1;
            selecting.num = 0;
        } else {
            // 交换：保存目标槽的属性，然后覆盖
            const tempItem = targetSlot.item;
            const tempNum = targetSlot.num;
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = tempItem;
            selecting.num = tempNum;
        }
        updateWorkbenchResult();
        return;
    }
}

export function handleWorkbenchContextMenu(): void {
    if (selectedWbType === null) {return;}

    // 如果选中输出槽且鼠标上已有物品，禁止操作
    if (selectedWbType === 'result' && selecting.item !== -1) {
        return;
    }

    let targetSlot: Slots;
    if (selectedWbType === 'crafting') {
        targetSlot = workbenchSlots[selectedWbIndex];
    } else {
        targetSlot = workbenchResultSlot;
    }

    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 鼠标空，目标有 -> 拿起1个
    if (!mouseHasItem && targetHasItem) {
        if (selectedWbType === 'result') {
            const outputId = targetSlot.item;
            const recipe = recipes.find(r => r.outputId === outputId);
            if (recipe && targetSlot.num >= recipe.outputCount) {
                const consumed = consumeFromGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS, 1);
                if (consumed === 1) {
                    selecting.item = outputId;
                    selecting.num = recipe.outputCount;
                }
            }
        } else {
            selecting.item = targetSlot.item;
            selecting.num = 1;
            targetSlot.num -= 1;
            if (targetSlot.num === 0) targetSlot.item = -1;
            updateWorkbenchResult();
        }
        return;
    }

    // 鼠标有，尝试放入1个
    if (mouseHasItem) {
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
            updateWorkbenchResult();
        } else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
            updateWorkbenchResult();
        }
    }
}

function main(): void {
    //初始化 9 个空槽位
    for (let i = 0; i < WORKBENCH_COLS * WORKBENCH_ROWS; i++) {
        workbenchSlots.push(new Slots(-1, 0));
    }
}
main();
