import { handleFurnaceClick, handleFurnaceContextMenu, getFurnaceSelectedIndex, handleFurnaceBackpackClick, handleFurnaceBackpackContextMenu, draw_furnace, furnaceLoop } from "./blockGUI/furnace.js";
import { handleChestClick, handleChestContextMenu, getChestSelectedIndex, handleChestBackpackClick, handleChestBackpackContextMenu, draw_chest } from "./blockGUI/chest.js";
import { uistate } from "../uiState.js";
import { player } from "../../player.js";
import { widgets, inventory, drawInventory } from "./inventory.js";
import { craftingResultSlot, craftingSlots, updateCraftingResult, recipes, consumeCraftingMaterials } from "./blockGUI/crafting.js";
import { handleWorkbenchClick, handleWorkbenchContextMenu, selectedWbType, draw_craftingTable } from "./blockGUI/crafting_table.js";
import { apioxEvent, ApioxKeyboardEvent, ApioxMouseEvent, ApioxWheelEvent } from "../../../apiox/event.js";
import { Slots, InventoryConfig } from "./inventoryConfig.js";
import { heartsAct, drawHeart } from "./hearts.js";
import { mouse } from "../../mouse.js";
import * as PIXI from 'pixi.js';

// 底部物品栏容器（直接挂在 guiApp.stage）与拖拽浮层容器
export const widgetContainer = new PIXI.Container();
widgetContainer.visible = true;
widgetContainer.zIndex = 8;
export const floatContainer = new PIXI.Container();
floatContainer.zIndex = 10;

let isTriggered: boolean = false; // 状态锁
let selectedCraftingType: 'crafting' | 'result' | null = null;
let selectedCraftingIndex: number = -1;  // 对于输出槽始终为0
let selectedIndex: number = -1;
let selecting = new Slots(-1, 0); // 正在选取中的物品

// 高亮对象 储存高亮有关属性
const highWhite: {
    x: number; y: number; screenX: number; screenY: number;
} = {
    x: 0, y: 0,
    screenX: 0, screenY: 0 //第一个格子相对于屏幕左上角的偏移
};

apioxEvent.onKeyDown((ev: ApioxKeyboardEvent) => {
    if (ev.key === 'e') {
        if (ev.repeat) {return;}
        if (uistate.craftingTable_isOpening) {uistate.craftingTable_isOpening = false; return;}
        if (uistate.chest_isOpening) {uistate.chest_isOpening = false; return;}
        if (uistate.furnace_isOpening) {uistate.furnace_isOpening = false; return;}
        if (uistate.anyui_isOpening_except(uistate.inventory_isOpening)) {return;}
        uistate.inventory_isOpening = !uistate.inventory_isOpening;
    }

    //键盘选取物品栏的物品
    const num = Number(ev.key);
    if (!isNaN(num) && num >= 1 && num <= 9 && ev.key.length === 1) {widgets.select = num - 1;}
});
apioxEvent.onWheel((event: ApioxWheelEvent) => {
    // deltaY > 0 向下滚动，< 0 向上滚动
    //滚动物品栏
    widgets.select += 1 * event.deltaY/Math.abs(event.deltaY);
    if (widgets.select > 8){widgets.select = 0;}
    else if (widgets.select < 0){widgets.select = 8;}
});
apioxEvent.onMouseDown((e: ApioxMouseEvent) => {
    if (isTriggered) {return;} //防重复

    // 左键部分
    if (e.button === 0) {
        //工作台优先
        if (uistate.craftingTable_isOpening) {
            handleWorkbenchClick(); //尝试处理工作台合成区域
            if (selectedWbType === null) { //未命中工作台区域 操作背包
                handleBackpackClick();
            }
            return;
        }

        if (uistate.chest_isOpening) {
            handleChestClick(selecting);
            if (getChestSelectedIndex() !== -1) {
                return; // 命中了箱子槽位，已处理
            }
            // 未命中箱子槽位，尝试处理背包
            handleChestBackpackClick();
            return;
        }

        if (uistate.furnace_isOpening) {
            handleFurnaceClick(selecting);
            if (getFurnaceSelectedIndex() !== -1) {
                return; // 命中了熔炉槽位，已处理
            }
            // 未命中熔炉槽位，尝试处理背包
            handleFurnaceBackpackClick();
            return;
        }

        if (!uistate.inventory_isOpening) {return;}

        // 优先处理合成区域
        if (selectedCraftingType !== null) {
            let targetSlot: Slots;
            if (selectedCraftingType === 'crafting') {
                targetSlot = craftingSlots[selectedCraftingIndex];
            } else {
                targetSlot = craftingResultSlot;
            }

            if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

            const mouseHasItem = (selecting.item !== -1);
            const targetHasItem = (targetSlot.item !== -1);

            // 鼠标空，目标有 -> 拿起
            if (!mouseHasItem && targetHasItem) {
                if (selectedCraftingType === 'result') {
                    // 先记录结果槽的信息
                    const outputId = targetSlot.item;
                    const recipe = recipes.find(r => r.outputId === outputId);
                    if (recipe) {
                        // 消耗原料（会内部更新结果槽）
                        const consumedTimes = consumeCraftingMaterials();
                        if (consumedTimes > 0) {
                            const takenCount = recipe.outputCount * consumedTimes;
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
                    const temp = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
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

        const targetSlot = inventory.items[selectedIndex];
        const mouseHasItem = (selecting.item !== -1);
        const targetHasItem = (targetSlot.item !== -1);

        // 1. 双方都空 → 无操作
        if (!mouseHasItem && !targetHasItem) {
            return;
        }

        // 2. 鼠标空，目标有 → 拿起
        if (!mouseHasItem && targetHasItem) {
            selecting = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
            targetSlot.item = -1;
            targetSlot.num = 0;
            return;
        }

        // 3. 鼠标有，目标空 → 放下
        if (mouseHasItem && !targetHasItem) {
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting = new Slots(-1, 0);
            return;
        }

        // 4. 双方都有物品
        if (mouseHasItem && targetHasItem) {
            // 物品相同且可以叠加（叠加后不超过目标上限）
            if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
                // 合并到目标格子，清空鼠标
                targetSlot.num += selecting.num;
                selecting = new Slots(-1, 0);
            } else {
                // 物品不同 或 相同但叠加会超过上限 → 交换
                const temp = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
                targetSlot.item = selecting.item;
                targetSlot.num = selecting.num;
                selecting.item = temp.item;
                selecting.num = temp.num;
            }
        }
    }

    // 右键部分
    if (e.button === 2) {
        e.preventDefault();
        if (uistate.craftingTable_isOpening) {
            handleWorkbenchContextMenu();
            if (selectedWbType === null) {
                handleBackpackContextMenu();
            }
            return;
        }

        if (uistate.chest_isOpening) {
            handleChestContextMenu(selecting);
            if (getChestSelectedIndex() !== -1) {
                return;
            }
            handleChestBackpackContextMenu();
            return;
        }

        if (uistate.furnace_isOpening) {
            handleFurnaceContextMenu(selecting);
            if (getFurnaceSelectedIndex() !== -1) {
                return;
            }
            handleFurnaceBackpackContextMenu();
            return;
        }

        if (!uistate.inventory_isOpening) {return;}

        //优先处理合成区域
        if (selectedCraftingType !== null) {
            let targetSlot: Slots;
            if (selectedCraftingType === 'crafting') {
                targetSlot = craftingSlots[selectedCraftingIndex];
            } else { // 'result'
                targetSlot = craftingResultSlot;
            }

            if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

            const mouseHasItem = (selecting.item !== -1);
            const targetHasItem = (targetSlot.item !== -1);

            // 情况1：鼠标上有物品，目标槽可放入单个（相同物品且未满，或目标空）
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
                if (selectedCraftingType === 'crafting') {
                    updateCraftingResult();
                } else {
                    updateCraftingResult();
                }
                return; // 关键：处理完后立即返回
            }

            // 情况2：鼠标空，目标有物品 → 拿起1个
            if (!mouseHasItem && targetHasItem) {
                if (selectedCraftingType === 'result') {
                    const outputId = targetSlot.item;
                    // 找到对应的配方，获取单次产出数量
                    const recipe = recipes.find(r => r.outputId === outputId);
                    if (recipe && targetSlot.num >= recipe.outputCount) {
                        const consumed = consumeCraftingMaterials(1);
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
                return; // 关键：处理完后立即返回
            }

            // 其他情况（鼠标空且目标空，或鼠标有但目标满且不同物品）无操作，也要返回
            return;
        }

        if (selectedIndex === -1) {return;}

        const targetSlot = inventory.items[selectedIndex];
        const mouseHasItem = (selecting.item !== -1);
        const targetHasItem = (targetSlot.item !== -1);

        // 鼠标空，目标有物品 → 拿起1个
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
            // 目标格子为空 → 放入一个
            if (targetSlot.item === -1) {
                targetSlot.item = selecting.item;
                targetSlot.num = 1;
                selecting.num -= 1;
                if (selecting.num === 0) {
                    selecting = new Slots(-1, 0);
                }
            }
            // 目标格子物品相同且未满 → 增加一个
            else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
                targetSlot.num += 1;
                selecting.num -= 1;
                if (selecting.num === 0) {
                    selecting = new Slots(-1, 0);
                }
            }
            // 其他情况（物品不同或已满）不做操作
        }
    }
});
apioxEvent.onMouseUp(() => {
    isTriggered = false;
});

// 高亮检测（同时记录悬停槽位索引，供点击处理使用）
function locateHighWhite(obj_IC: InventoryConfig, inven_X: number, inven_Y: number, graphics: PIXI.Graphics): void {
    highWhite.screenX = inven_X + obj_IC.startX;
    highWhite.screenY = inven_Y + obj_IC.startY;

    if (mouse.x >= highWhite.screenX && mouse.x <= highWhite.screenX + (obj_IC.slotWidth + obj_IC.paddingX) * obj_IC.cols &&
        mouse.y >= highWhite.screenY && mouse.y <= highWhite.screenY + (obj_IC.slotHeight + obj_IC.paddingY) * obj_IC.rows) {

        const col: number = Math.floor((mouse.x - highWhite.screenX) / (obj_IC.slotWidth + obj_IC.paddingX));
        const row: number = Math.floor((mouse.y - highWhite.screenY) / (obj_IC.slotHeight + obj_IC.paddingY));

        highWhite.x = highWhite.screenX + col * (obj_IC.slotWidth + obj_IC.paddingX);
        highWhite.y = highWhite.screenY + row * (obj_IC.slotHeight + obj_IC.paddingY);

        //绘制高亮矩形（Pixi Graphics）
        graphics.beginFill(0xffffff, 0.3);
        graphics.drawRect(highWhite.x, highWhite.y, obj_IC.slotWidth, obj_IC.slotHeight);
        graphics.endFill();
        graphics.visible = true;

        if (obj_IC.rows === 3 && obj_IC.cols === 9) {
            selectedIndex = 9 + row * obj_IC.cols + col;
        } else if (obj_IC.rows === 1 && obj_IC.cols === 9) {
            selectedIndex = row * obj_IC.cols + col;
        }
    }
}

function locateHighWhiteForCrafting(obj_IC: InventoryConfig, invenX: number, invenY: number, slotsArray: Slots[], type: "crafting" | "result", graphics: PIXI.Graphics): void {
    const startX: number = invenX + obj_IC.startX;
    const startY: number = invenY + obj_IC.startY;
    const slotW: number = obj_IC.slotWidth + obj_IC.paddingX;
    const slotH: number = obj_IC.slotHeight + obj_IC.paddingY;

    if (mouse.x >= startX && mouse.x <= startX + slotW * obj_IC.cols &&
        mouse.y >= startY && mouse.y <= startY + slotH * obj_IC.rows) {
        
        const col: number = Math.floor((mouse.x - startX) / slotW);
        const row: number = Math.floor((mouse.y - startY) / slotH);
        const idx: number = row * obj_IC.cols + col;
        if (idx < slotsArray.length) {
            selectedCraftingType = type;
            selectedCraftingIndex = idx;
            // 绘制高亮
            graphics.beginFill(0xffffff, 0.3);
            graphics.drawRect(startX + col * slotW, startY + row * slotH, obj_IC.slotWidth, obj_IC.slotHeight);
            graphics.endFill();
        }
    }
}

// 每帧绘制前重置悬停状态
export function resetSlotSelection(): void {
    selectedIndex = -1;
    selectedCraftingType = null;
    selectedCraftingIndex = -1;
}

// 背包左键点击逻辑（从原 click 事件中提取）
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

// 背包右键点击逻辑
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

export function setSelectedIndex(newVal: number): void {
    selectedIndex = newVal;
}

export function gameGuiLoop(): void {
    if (player.hp > 0) {
        heartsAct();
        drawHeart();
        floatContainer.visible = uistate.invenUI_isOpening();
        drawInventory();
        draw_craftingTable();
        draw_chest();
        draw_furnace();
        furnaceLoop();
    }
}

export { selecting, selectedIndex, locateHighWhite, locateHighWhiteForCrafting };