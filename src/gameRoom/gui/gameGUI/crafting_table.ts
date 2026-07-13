import { iC_hand, invenConfig, ct_crafting, ct_get, Slots } from "./inventoryConfig.js";
import { ctx_gui, img_gui, locateHighWhite, canvas_gui, inventory, drawIteminInventory, selecting, drawBackpackItems } from "./inventory.js";
import { updateResultForGrid, consumeFromGrid, recipes } from './crafting.js';
import { mouse } from "../../mouse.js";
import { world, room } from "../../const.js";
import { apioxEvent, ApioxMouseEvent } from "../../../apiox/event.js";

const craftingTable: {isOpening: boolean; width: number; height: number;} = {
    isOpening: false, width: 704, height: 664
}

// 工作台的合成网格（3x3）和输出槽
export const workbenchSlots: Slots[] = [];
export const workbenchResultSlot = new Slots(-1, 0);
const WORKBENCH_COLS = 3;
const WORKBENCH_ROWS = 3;

// 初始化 9 个空槽位
for (let i = 0; i < WORKBENCH_COLS * WORKBENCH_ROWS; i++) {
    workbenchSlots.push(new Slots(-1, 0));
}

// 工作台高亮相关
let selectedWbType: 'crafting' | 'result' | null = null;
let selectedWbIndex: number = -1;

// 更新工作台合成结果
function updateWorkbenchResult() {
    updateResultForGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS);
}

// 绘制工作台合成区域的高亮
function drawWorkbenchHighlights(invenX: number, invenY: number) {
    selectedWbType = null;
    selectedWbIndex = -1;

    // 处理合成网格 (3x3)
    const gridStartX = invenX + ct_crafting.startX;
    const gridStartY = invenY + ct_crafting.startY;
    const slotW = ct_crafting.slotWidth + ct_crafting.paddingX;
    const slotH = ct_crafting.slotHeight + ct_crafting.paddingY;

    if (mouse.x >= gridStartX && mouse.x <= gridStartX + slotW * ct_crafting.cols &&
        mouse.y >= gridStartY && mouse.y <= gridStartY + slotH * ct_crafting.rows) {
        const col = Math.floor((mouse.x - gridStartX) / slotW);
        const row = Math.floor((mouse.y - gridStartY) / slotH);
        const idx = row * ct_crafting.cols + col;
        if (idx < workbenchSlots.length) {
            selectedWbType = 'crafting';
            selectedWbIndex = idx;
            ctx_gui.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx_gui.fillRect(gridStartX + col * slotW, gridStartY + row * slotH,
                ct_crafting.slotWidth, ct_crafting.slotHeight);
        }
    }

    // 处理输出槽 (1x1)
    const outStartX = invenX + ct_get.startX;
    const outStartY = invenY + ct_get.startY;
    if (mouse.x >= outStartX && mouse.x <= outStartX + ct_get.slotWidth &&
        mouse.y >= outStartY && mouse.y <= outStartY + ct_get.slotHeight) {
        selectedWbType = 'result';
        selectedWbIndex = 0;
        ctx_gui.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx_gui.fillRect(outStartX, outStartY, ct_get.slotWidth, ct_get.slotHeight);
    }
}

apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
    if(ev.button !== 2 || inventory.isOpening) {return;}
    if(world[mouse.world_y][mouse.world_x] === 9 && craftingTable.isOpening === false) {
        craftingTable.isOpening = true;
    }
});

function draw_craftingTable(): void {
    if (!craftingTable.isOpening) {return;}

    const invenX = (room.width - craftingTable.width) / 2;
    const invenY = (room.height - craftingTable.height) / 2;

    ctx_gui.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx_gui.fillRect(0, 0, canvas_gui.width, canvas_gui.height);
    ctx_gui.drawImage(img_gui.crafting_table, 0, 0, 176, 166, invenX, invenY, craftingTable.width, craftingTable.height);

    //绘制工作台自己的合成网格和输出槽
    for (let i = 0; i < workbenchSlots.length; i++) {
        const row = Math.floor(i / ct_crafting.cols);
        const col = i % ct_crafting.cols;
        const drawX = invenX + ct_crafting.startX + col * (ct_crafting.slotWidth + ct_crafting.paddingX);
        const drawY = invenY + ct_crafting.startY + row * (ct_crafting.slotHeight + ct_crafting.paddingY);
        drawIteminInventory(workbenchSlots[i], drawX + 8, drawY + 8, 48, 48, drawX + 48, drawY + 64);
    }
    const outX = invenX + ct_get.startX;
    const outY = invenY + ct_get.startY;
    drawIteminInventory(workbenchResultSlot, outX + 24, outY + 24, 48, 48, outX + 64, outY + 80);

    //绘制背包物品（热键栏+背包格子）
    drawBackpackItems(invenX, invenY);

    //高亮绘制（背包 + 工作台）
    //背包高亮（会更新 selectedIndex）
    locateHighWhite(invenConfig, invenX, invenY);
    locateHighWhite(iC_hand, invenX, invenY);
    //工作台自身高亮（会更新 selectedWbType 等）
    drawWorkbenchHighlights(invenX, invenY);

    //绘制鼠标上拖拽的物品
    if (selecting.item !== -1) {
        drawIteminInventory(selecting, mouse.x - 24, mouse.y - 24, 48, 48, mouse.x + 16, mouse.y + 24);
    }
}

// 导出工作台交互函数，供 inventory.ts 的全局事件调用
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
    if (selectedWbType === null) {return};

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

export { draw_craftingTable, craftingTable, selectedWbType };