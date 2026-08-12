// craftingRecipe.test.ts
// 验证 recipes 配方数据的单元测试
// 运行：npm test（vitest）
import { describe, it, expect } from 'vitest';
import { recipes, RecipeShape } from '../src/gameRoom/gui/gameGUI/blockGUI/craftingRecipe.js';
import { idOfBlock } from '../src/gameRoom/nature/blockMecha/blocks.js';
import { idOfItem } from '../src/gameRoom/dropped/itemIds.js';

function findRecipe(outputId: number): RecipeShape | undefined {
    return recipes.find(r => r.outputId === outputId);
}

// 逐格比较两个配方形状（含材料与数量）
function sameCells(a: (RecipePosLike | null)[][], b: (RecipePosLike | null)[][]): boolean {
    if (a.length !== b.length) {return false;}
    for (let r = 0; r < a.length; r++) {
        if (a[r].length !== b[r].length) {return false;}
        for (let c = 0; c < a[r].length; c++) {
            const pa = a[r][c];
            const pb = b[r][c];
            if (pa === null || pb === null) {
                if (pa !== pb) {return false;}
            } else if (pa.itemId !== pb.itemId || pa.amount !== pb.amount) {
                return false;
            }
        }
    }
    return true;
}

interface RecipePosLike {
    itemId: number;
    amount: number;
}

// 新增 9 个配方（剑/斧/铲，木/石/铁）的期望值
const expectedNewRecipes: { name: string; outputId: number; outputCount: number; cells: (RecipePosLike | null)[][] }[] = [
    { // 木剑
        name: '木剑', outputId: idOfItem.wooden_sword, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
    { // 石剑
        name: '石剑', outputId: idOfItem.stone_sword, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
    { // 铁剑
        name: '铁剑', outputId: idOfItem.iron_sword, outputCount: 1,
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
    { // 木斧
        name: '木斧', outputId: idOfItem.wooden_axe, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
    },
    { // 石斧
        name: '石斧', outputId: idOfItem.stone_axe, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
    },
    { // 铁斧
        name: '铁斧', outputId: idOfItem.iron_axe, outputCount: 1,
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
    },
    { // 木铲
        name: '木铲', outputId: idOfItem.wooden_shovel, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
    { // 石铲
        name: '石铲', outputId: idOfItem.stone_shovel, outputCount: 1,
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
    { // 铁铲
        name: '铁铲', outputId: idOfItem.iron_shovel, outputCount: 1,
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
    },
];

describe('配方数据完整性', () => {
    it('新增 9 个工具配方存在,且形状/单次产出数量正确', () => {
        for (const expected of expectedNewRecipes) {
            const recipe = findRecipe(expected.outputId);
            expect(recipe, `配方存在：${expected.name}（outputId=${expected.outputId}）`).toBeDefined();
            if (!recipe) {continue;}
            expect(sameCells(recipe.cells, expected.cells), `形状正确：${expected.name}`).toBe(true);
            expect(recipe.outputCount, `单次产出数量正确：${expected.name}（应为 ${expected.outputCount}）`).toBe(expected.outputCount);
        }
    });

    it('每个新物品恰好有一个产出配方（防止重复配方互相遮蔽或缺失）', () => {
        const newItemIds: number[] = [
            idOfItem.wooden_sword, idOfItem.stone_sword, idOfItem.iron_sword,
            idOfItem.wooden_axe, idOfItem.stone_axe, idOfItem.iron_axe,
            idOfItem.wooden_shovel, idOfItem.stone_shovel, idOfItem.iron_shovel,
        ];
        for (const itemId of newItemIds) {
            const count = recipes.filter(r => r.outputId === itemId).length;
            expect(count, `物品 id=${itemId} 恰好有一个产出配方（实际 ${count} 个）`).toBe(1);
        }
    });

    it('全部配方的 cells 尺寸与 gridWidth/gridHeight 一致', () => {
        for (const recipe of recipes) {
            expect(recipe.cells.length, `gridHeight 与 cells 行数一致（outputId=${recipe.outputId}）`).toBe(recipe.gridHeight);
            for (const row of recipe.cells) {
                expect(row.length, `gridWidth 与 cells 列数一致（outputId=${recipe.outputId}）`).toBe(recipe.gridWidth);
            }
            expect(recipe.outputCount, `产出数量至少为 1（outputId=${recipe.outputId}）`).toBeGreaterThanOrEqual(1);
        }
    });

    it('不存在形状与材料完全相同的重复配方（先匹配者恒胜，后者被遮蔽）', () => {
        const seen = new Set<string>();
        for (const recipe of recipes) {
            const key = JSON.stringify(recipe.cells);
            expect(seen.has(key), `配方形状不重复（outputId=${recipe.outputId}）`).toBe(false);
            seen.add(key);
        }
    });

    it('所有配方引用的材料与产出都在枚举中有定义', () => {
        // 数值枚举运行时含反向映射（名字字符串），只取数字值作为合法 id
        const blockIds = new Set<number>(Object.values(idOfBlock).filter((v): v is number => typeof v === 'number'));
        const itemIds = new Set<number>(Object.values(idOfItem).filter((v): v is number => typeof v === 'number'));
        for (const recipe of recipes) {
            const outputValid = blockIds.has(recipe.outputId) || itemIds.has(recipe.outputId);
            expect(outputValid, `产出 id 已定义（outputId=${recipe.outputId}）`).toBe(true);
            for (const row of recipe.cells) {
                for (const cell of row) {
                    if (cell === null) {continue;}
                    const valid = blockIds.has(cell.itemId) || itemIds.has(cell.itemId);
                    expect(valid, `材料 id 已定义（outputId=${recipe.outputId}，cell itemId=${cell.itemId}）`).toBe(true);
                }
            }
        }
    });
});
