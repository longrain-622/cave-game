// gameGuiState.ts
// GUI 每帧逻辑与槽位几何：死亡状态、熔炉烧制、槽位命中测试。
import { player } from '../../player.js';
import { uistate } from '../uiState.js';
import { furnaceLoop } from './blockGUI/furnace.js';
import { room } from '../../../constants/generic.js';
import { inventory } from './inventory.js';
import { invenConfig, iC_hand, InventoryConfig } from './inventoryConfig.js';

export function gameGuiLogicLoop(delta: number): void {
    uistate.deathUI_isOpening = (player.hp <= 0);
    if (player.hp <= 0) {return;}
    furnaceLoop(delta);
}

export interface SlotHit {
    index: number; // 槽位在所属槽位数组中的下标
    x: number; y: number; // 该槽位左上角在屏幕上的坐标
}

// 背包界面：以 (room.width - 背包宽)/2 居中
export function inventoryOrigin(): { x: number; y: number } {
    return {
        x: (room.width - inventory.width) / 2,
        y: (room.height - inventory.height) / 2,
    };
}

// 箱子/熔炉/工作台界面：与背包共用 704×664 的绘制区域
export function blockGuiOrigin(): { x: number; y: number } {
    return {
        x: (room.width - 704) / 2,
        y: (room.height - 664) / 2,
    };
}

// 命中测试单个槽位矩阵；未命中返回 null。
export function hitTestSlot(
    mouseX: number,
    mouseY: number,
    config: InventoryConfig,
    originX: number,
    originY: number
): SlotHit | null {
    const screenX: number = originX + config.startX;
    const screenY: number = originY + config.startY;
    const stepX: number = config.slotWidth + config.paddingX;
    const stepY: number = config.slotHeight + config.paddingY;

    if (mouseX >= screenX && mouseX <= screenX + stepX * config.cols &&
        mouseY >= screenY && mouseY <= screenY + stepY * config.rows) {
        const col: number = Math.floor((mouseX - screenX) / stepX);
        const row: number = Math.floor((mouseY - screenY) / stepY);
        return {
            index: row * config.cols + col,
            x: screenX + col * stepX,
            y: screenY + row * stepY,
        };
    }
    return null;
}

// 命中测试单个槽位（边界不含 padding，供熔炉/工作台等单槽界面使用）。
export function hitTestSingleSlot(
    mouseX: number,
    mouseY: number,
    config: InventoryConfig,
    originX: number,
    originY: number
): SlotHit | null {
    const screenX: number = originX + config.startX;
    const screenY: number = originY + config.startY;

    if (mouseX >= screenX && mouseX <= screenX + config.slotWidth &&
        mouseY >= screenY && mouseY <= screenY + config.slotHeight) {
        return { index: 0, x: screenX, y: screenY };
    }
    return null;
}

// 命中测试背包（先热键栏 0~8，再主体 9~35）；未命中返回 null。
export function hitTestBackpack(
    mouseX: number,
    mouseY: number,
    originX: number,
    originY: number
): SlotHit | null {
    const hand: SlotHit | null = hitTestSlot(mouseX, mouseY, iC_hand, originX, originY);
    if (hand) {return hand;}

    const main: SlotHit | null = hitTestSlot(mouseX, mouseY, invenConfig, originX, originY);
    if (!main) {return null;}
    return { index: 9 + main.index, x: main.x, y: main.y };
}
