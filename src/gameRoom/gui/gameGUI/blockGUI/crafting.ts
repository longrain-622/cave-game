// crafting.ts
import { Slots } from "../inventoryConfig.js";
import { RecipeShape, recipes } from "./craftingRecipe.js";

export function slotsToMatrix(slots: Slots[], cols: number, rows: number): (Slots | null)[][] {
    const matrix: (Slots | null)[][] = [];
    for (let r = 0; r < rows; r++) {
        matrix[r] = [];
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx < slots.length && slots[idx].item !== -1) {
                matrix[r][c] = slots[idx];
            } else {
                matrix[r][c] = null;
            }
        }
    }
    return matrix;
}

// 匹配配方，返回最大可合成次数
export function findMatchingRecipe(
    matrix: (Slots | null)[][],
    recipe: RecipeShape
): number {
    const gridRows: number = matrix.length;
    const gridCols: number = gridRows > 0 ? matrix[0].length : 0;
    const shapeRows: number = recipe.gridHeight;
    const shapeCols: number = recipe.gridWidth;

    for (let offRow = 0; offRow <= gridRows - shapeRows; offRow++) {
        for (let offCol = 0; offCol <= gridCols - shapeCols; offCol++) {
            let match: boolean = true;
            let times: number = Infinity;

            //检查配方内部
            for (let r = 0; r < shapeRows; r++) {
                for (let c = 0; c < shapeCols; c++) {
                    const target: Slots = matrix[offRow + r]?.[offCol + c];
                    const pattern = recipe.cells[r][c];
                    if (pattern === null) {
                        if (target !== null) {match = false; break;}
                    } else {
                        if (!target || target.item !== pattern.itemId) { match = false; break; }
                        const availableTimes: number = Math.floor(target.num / pattern.amount);
                        times = Math.min(times, availableTimes);
                    }
                }
                if (!match) {break;}
            }
            if (!match || times === Infinity) {continue;}

            //检查配方外是否有多余物品
            let hasExtra: boolean = false;
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    const target: Slots = matrix[r][c];
                    if (target === null) {continue;}
                    const inShape = (r >= offRow && r < offRow + shapeRows &&
                                     c >= offCol && c < offCol + shapeCols &&
                                     recipe.cells[r - offRow][c - offCol] !== null);
                    if (!inShape) {
                        hasExtra = true;
                        break;
                    }
                }
                if (hasExtra) {break;}
            }
            if (hasExtra) {continue;}

            return times;
        }
    }
    return 0;
}

function findMatchingRecipeWithOffset(
    matrix: (Slots | null)[][],
    recipe: RecipeShape
): { offsetRow: number; offsetCol: number; times: number } | null {
    const gridRows: number = matrix.length;
    const gridCols: number = gridRows > 0 ? matrix[0].length : 0;
    const shapeRows: number = recipe.gridHeight;
    const shapeCols: number = recipe.gridWidth;

    for (let offRow = 0; offRow <= gridRows - shapeRows; offRow++) {
        for (let offCol = 0; offCol <= gridCols - shapeCols; offCol++) {
            let match: boolean = true;
            let times: number = Infinity;

            //检查配方内部
            for (let r = 0; r < shapeRows; r++) {
                for (let c = 0; c < shapeCols; c++) {
                    const target: Slots = matrix[offRow + r]?.[offCol + c];
                    const pattern = recipe.cells[r][c];
                    if (pattern === null) {
                        if (target !== null) { match = false; break; }
                    } else {
                        if (!target || target.item !== pattern.itemId) { match = false; break; }
                        const availableTimes: number = Math.floor(target.num / pattern.amount);
                        times = Math.min(times, availableTimes);
                    }
                }
                if (!match) {break;}
            }
            if (!match || times === Infinity) {continue;}

            //检查配方外是否有多余物品
            let hasExtra: boolean = false;
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    const target: Slots = matrix[r][c];
                    if (target === null) {continue;}
                    const inShape = (r >= offRow && r < offRow + shapeRows &&
                                     c >= offCol && c < offCol + shapeCols &&
                                     recipe.cells[r - offRow][c - offCol] !== null);
                    if (!inShape) {
                        hasExtra = true;
                        break;
                    }
                }
                if (hasExtra) {break;}
            }
            if (hasExtra) {continue;}

            return { offsetRow: offRow, offsetCol: offCol, times };
        }
    }
    return null;
}

// 根据配方消耗材料（从原槽位扣除）
export function consumeMaterialsByRecipe(
    slots: Slots[],
    recipe: RecipeShape,
    times: number,
    offsetRow: number,
    offsetCol: number
): boolean {
    const cols: number = 2, rows: number = 2;
    const matrix: Slots[][] = slotsToMatrix(slots, cols, rows);
    for (let r = 0; r < recipe.gridHeight; r++) {
        for (let c = 0; c < recipe.gridWidth; c++) {
            const pattern = recipe.cells[r][c];
            if (pattern === null) {continue;}
            const slot = matrix[offsetRow + r]?.[offsetCol + c];
            if (!slot || slot.item !== pattern.itemId) {return false;}
            const deduct = pattern.amount * times;
            if (slot.num < deduct) {return false;}
            slot.num -= deduct;
            if (slot.num === 0) {slot.item = -1;}
        }
    }
    // 将矩阵修改同步回 slots 数组
    for (let i = 0; i < slots.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const newSlot = matrix[row]?.[col];
        if (newSlot) {
            slots[i].item = newSlot.item;
            slots[i].num = newSlot.num;
        } else {
            slots[i].item = -1;
            slots[i].num = 0;
        }
    }
    return true;
}

// 导出合成槽位
export const craftingSlots: Slots[] = [
    new Slots(-1, 0), new Slots(-1, 0),
    new Slots(-1, 0), new Slots(-1, 0)
];
export const craftingResultSlot = new Slots(-1, 0);

// 更新合成结果
export function updateCraftingResult() {
    const matrix: Slots[][] = slotsToMatrix(craftingSlots, 2, 2);
    for (const recipe of recipes) {
        const times: number = findMatchingRecipe(matrix, recipe);
        if (times > 0) {
            craftingResultSlot.item = recipe.outputId;
            craftingResultSlot.num = recipe.outputCount * times;
            return;
        }
    }
    craftingResultSlot.item = -1;
    craftingResultSlot.num = 0;
}

// 消耗材料（供外部调用）
export function consumeCraftingMaterials(times?: number): number {
    const matrix: Slots[][] = slotsToMatrix(craftingSlots, 2, 2);
    for (const recipe of recipes) {
        const match = findMatchingRecipeWithOffset(matrix, recipe);
        if (!match) {continue;}
        const maxTimes = match.times;
        const targetTimes = times !== undefined ? Math.min(times, maxTimes) : maxTimes;
        if (targetTimes === 0) {continue;}
        if (consumeMaterialsByRecipe(craftingSlots, recipe, targetTimes, match.offsetRow, match.offsetCol)) {
            updateCraftingResult();
            return targetTimes;
        }
    }
    return 0;
}

export function slotsToMatrixGeneric(slots: Slots[], cols: number, rows: number): (Slots | null)[][] {
    //将任意尺寸的 Slots 数组转为矩阵（供匹配使用）
    const matrix: (Slots | null)[][] = [];
    for (let r = 0; r < rows; r++) {
        matrix[r] = [];
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (idx < slots.length && slots[idx].item !== -1) {
                matrix[r][c] = slots[idx];
            } else {
                matrix[r][c] = null;
            }
        }
    }
    return matrix;
}

export function findMatchingRecipeGeneric(
    slots: Slots[],
    cols: number,
    rows: number,
    recipe: RecipeShape
): { offsetRow: number; offsetCol: number; times: number } | null {
    const matrix: Slots[][] = slotsToMatrixGeneric(slots, cols, rows);
    const gridRows: number = matrix.length;
    const gridCols: number = gridRows > 0 ? matrix[0].length : 0;
    const shapeRows: number = recipe.gridHeight;
    const shapeCols: number = recipe.gridWidth;

    for (let offRow = 0; offRow <= gridRows - shapeRows; offRow++) {
        for (let offCol = 0; offCol <= gridCols - shapeCols; offCol++) {
            let match: boolean = true;
            let times: number = Infinity;

            //检查配方内部
            for (let r = 0; r < shapeRows; r++) {
                for (let c = 0; c < shapeCols; c++) {
                    const target: Slots = matrix[offRow + r]?.[offCol + c];
                    const pattern = recipe.cells[r][c];
                    if (pattern === null) {
                        if (target !== null) { match = false; break; }
                    } else {
                        if (!target || target.item !== pattern.itemId) { match = false; break; }
                        const availableTimes = Math.floor(target.num / pattern.amount);
                        times = Math.min(times, availableTimes);
                    }
                }
                if (!match) {break;}
            }
            if (!match || times === Infinity) {continue;}

            //检查配方外是否有多余物品
            let hasExtra: boolean = false;
            for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                    const target: Slots = matrix[r][c];
                    if (target === null) {continue;}
                    // 判断该格子是否在配方形状内
                    const inShape = (r >= offRow && r < offRow + shapeRows &&
                                     c >= offCol && c < offCol + shapeCols &&
                                     recipe.cells[r - offRow][c - offCol] !== null);
                    if (!inShape) {
                        hasExtra = true;
                        break;
                    }
                }
                if (hasExtra) {break;}
            }
            if (hasExtra) {continue;}

            //匹配成功
            return { offsetRow: offRow, offsetCol: offCol, times };
        }
    }
    return null;
}

export function consumeMaterialsGeneric(
    slots: Slots[],
    cols: number,
    rows: number,
    recipe: RecipeShape,
    times: number,
    offsetRow: number,
    offsetCol: number
): boolean {
    //消耗指定合成网格中的材料（通用版）
    const matrix = slotsToMatrixGeneric(slots, cols, rows);
    for (let r = 0; r < recipe.gridHeight; r++) {
        for (let c = 0; c < recipe.gridWidth; c++) {
            const pattern = recipe.cells[r][c];
            if (pattern === null) {continue;}
            const slot = matrix[offsetRow + r]?.[offsetCol + c];
            if (!slot || slot.item !== pattern.itemId) {return false;}
            const deduct = pattern.amount * times;
            if (slot.num < deduct) {return false;}
            slot.num -= deduct;
            if (slot.num === 0) {slot.item = -1;}
        }
    }
    // 同步回 slots 数组
    for (let i = 0; i < slots.length; i++) {
        const row: number = Math.floor(i / cols);
        const col: number = i % cols;
        const newSlot: Slots = matrix[row]?.[col];
        if (newSlot) {
            slots[i].item = newSlot.item;
            slots[i].num = newSlot.num;
        } else {
            slots[i].item = -1;
            slots[i].num = 0;
        }
    }
    return true;
}

export function updateResultForGrid(
    slots: Slots[],
    resultSlot: Slots,
    cols: number,
    rows: number
): boolean {
    for (const recipe of recipes) {
        const match = findMatchingRecipeGeneric(slots, cols, rows, recipe);
        if (match && match.times > 0) {
            resultSlot.item = recipe.outputId;
            resultSlot.num = recipe.outputCount * match.times;
            return true;
        }
    }
    resultSlot.item = -1;
    resultSlot.num = 0;
    return false;
}

export function consumeFromGrid(
    slots: Slots[],
    resultSlot: Slots,
    cols: number,
    rows: number,
    times?: number
): number {
    for (const recipe of recipes) {
        const match = findMatchingRecipeGeneric(slots, cols, rows, recipe);
        if (!match) {continue;}
        const maxTimes: number = match.times;
        const targetTimes: number = times !== undefined ? Math.min(times, maxTimes) : maxTimes;
        if (targetTimes === 0) {continue;}
        if (consumeMaterialsGeneric(slots, cols, rows, recipe, targetTimes, match.offsetRow, match.offsetCol)) {
            updateResultForGrid(slots, resultSlot, cols, rows);
            return targetTimes;
        }
    }
    return 0;
}
