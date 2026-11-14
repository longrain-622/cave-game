// guiInput.ts
// GUI 相关的全局输入：打开/关闭界面、背包槽位路由、滚轮选取、F3 调试屏、Escape 暂停菜单。
import { apioxEvent, ApioxKeyboardEvent, ApioxWheelEvent, ApioxMouseEvent } from '../../apiox/event.js';
import { uistate } from '../gui/uiState.js';
import { mouse } from '../mouse.js';
import { widgets, selecting, handleInventorySlotClick, handleInventorySlotContextMenu, handleBackpackClick, handleBackpackContextMenu } from '../gui/gameGUI/inventory.js';
import { handleChestClick, handleChestContextMenu, getChestSelectedIndex, handleChestBackpackClick, handleChestBackpackContextMenu, setCurrentChest } from '../gui/gameGUI/blockGUI/chest.js';
import { handleFurnaceClick, handleFurnaceContextMenu, getFurnaceSelectedIndex, handleFurnaceBackpackClick, handleFurnaceBackpackContextMenu, setCurrentFurnace } from '../gui/gameGUI/blockGUI/furnace.js';
import { handleWorkbenchClick, handleWorkbenchContextMenu, selectedWbType } from '../gui/gameGUI/blockGUI/crafting_table.js';
import { toggleDebugScreen } from '../gui/contentGUI/debugScreen.js';
import { blockTypeAt } from '../world.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { isClient } from '../net/session.js';

// 右键点击方块打开对应的 GUI 界面（箱子/熔炉/工作台）
function registerBlockGuiOpen(): void {
    apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
        if (ev.button !== 2) {return;}
        const type: number = blockTypeAt(mouse.world_x, mouse.world_y);

        if (type === idOfBlock.chest) {
            if (uistate.anyui_isOpening_except(uistate.chest_isOpening)) {return;}
            if (!uistate.chest_isOpening) {
                setCurrentChest(mouse.world_x, mouse.world_y);
                uistate.chest_isOpening = true;
            }
            return;
        }

        if (type === idOfBlock.furnace) {
            if (uistate.anyui_isOpening_except(uistate.furnace_isOpening)) {return;}
            if (!uistate.furnace_isOpening) {
                setCurrentFurnace(mouse.world_x, mouse.world_y);
                uistate.furnace_isOpening = true;
            }
            return;
        }

        if (type === idOfBlock.crafting_table) {
            if (uistate.anyui_isOpening_except(uistate.craftingTable_isOpening)) {return;}
            if (!uistate.craftingTable_isOpening) {
                uistate.craftingTable_isOpening = true;
            }
        }
    });
}

// e/数字键与滚轮
function registerInventoryKeys(): void {
    apioxEvent.onKeyDown((ev: ApioxKeyboardEvent) => {
        if (ev.key === 'e') {
            if (ev.repeat) {return;}
            if (uistate.craftingTable_isOpening) {uistate.craftingTable_isOpening = false; return;}
            if (uistate.chest_isOpening) {uistate.chest_isOpening = false; return;}
            if (uistate.furnace_isOpening) {uistate.furnace_isOpening = false; return;}
            if (uistate.anyui_isOpening_except(uistate.inventory_isOpening)) {return;}
            uistate.inventory_isOpening = !uistate.inventory_isOpening;
        }

        // 键盘选取物品栏的物品
        const num = Number(ev.key);
        if (!isNaN(num) && num >= 1 && num <= 9 && ev.key.length === 1) {widgets.select = num - 1;}
    });

    apioxEvent.onWheel((event: ApioxWheelEvent) => {
        widgets.select += 1 * event.deltaY/Math.abs(event.deltaY); // 滚动物品栏
        if (widgets.select > 8){widgets.select = 0;}
        else if (widgets.select < 0){widgets.select = 8;}
    });
}

// 背包/箱子/熔炉/工作台的鼠标槽位路由
function registerInventoryMouse(): void {
    apioxEvent.onMouseDown((e: ApioxMouseEvent) => {
        // 左键部分
        if (e.button === 0) {
            //工作台优先
            if (uistate.craftingTable_isOpening) {
                handleWorkbenchClick(); // 尝试处理工作台合成区域
                if (selectedWbType === null) { // 未命中工作台区域 操作背包
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
            handleInventorySlotClick();
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
            handleInventorySlotContextMenu();
        }
    });
}

// Escape 切换暂停菜单
function registerPauseKey(): void {
    apioxEvent.onKeyDown((e): void => {
        if (e.key !== 'Escape') {return;}
        if (e.repeat) {return;}
        if (uistate.anyui_isOpening() && !uistate.gameContent_isOpening) {return;}
        uistate.gameContent_isOpening = !uistate.gameContent_isOpening;
    });
}

// F3 切换调试屏
function registerDebugKey(): void {
    apioxEvent.onKeyDown((ev): void => {
        if (ev.key !== 'F3') {return;}
        if (ev.repeat) {return;}
        ev.preventDefault();
        toggleDebugScreen();
    });
}

function main(): void {
    registerPauseKey();
    registerDebugKey();
    if (isClient()) {return;}
    registerBlockGuiOpen();
    registerInventoryKeys();
    registerInventoryMouse();
}
main();
