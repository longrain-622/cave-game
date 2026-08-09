import { idOfBlock } from "../../../nature/blockMecha/blocks.js";
import { idOfItem } from "../../../dropped/itemIds.js";

// 配方定义
interface RecipePos {
    itemId: number;
    amount: number;
}

interface RecipeShape {
    cells: (RecipePos | null)[][];
    outputId: number;
    outputCount: number; // 单次合成产出数量
    gridWidth: number;
    gridHeight: number;
}

// 配方库
const recipes: RecipeShape[] = [
    { // 木板
        cells: [[{ itemId: idOfBlock.oak, amount: 1 }]],
        outputId: idOfBlock.planks,
        outputCount: 4,
        gridWidth: 1,
        gridHeight: 1
    },
    { // 工作台
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }]
        ],
        outputId: idOfBlock.crafting_table,
        outputCount: 1,
        gridWidth: 2,
        gridHeight: 2
    },
    { // 木棍
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }]
        ],
        outputId: idOfItem.stick,
        outputCount: 4,
        gridWidth: 1,
        gridHeight: 2
    },
    { // 木镐
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.wooden_pickaxe,
        outputCount: 1,
        gridWidth: 3,
        gridHeight: 3
    },
    { // 石镐
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.stone_pickaxe,
        outputCount: 1,
        gridWidth: 3,
        gridHeight: 3
    },
    { // 铁镐
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
            [null, { itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.iron_pickaxe,
        outputCount: 1,
        gridWidth: 3,
        gridHeight: 3
    },
    { // 橡木门
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
        ],
        outputId: idOfItem.oak_door,
        outputCount: 3,
        gridWidth: 2,
        gridHeight: 3
    },
    { // 箱子
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }, null, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
        ],
        outputId: idOfBlock.chest,
        outputCount: 1,
        gridWidth: 3,
        gridHeight: 3
    },
    { // 熔炉
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, null, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
        ],
        outputId: idOfBlock.furnace,
        outputCount: 1,
        gridWidth: 3,
        gridHeight: 3
    },
    { // 木剑
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.wooden_sword,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
    { // 石剑
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.stone_sword,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
    { // 铁剑
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.iron_sword,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
    { // 木斧
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.wooden_axe,
        outputCount: 1,
        gridWidth: 2,
        gridHeight: 3
    },
    { // 石斧
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.stone_axe,
        outputCount: 1,
        gridWidth: 2,
        gridHeight: 3
    },
    { // 铁斧
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, { itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }, null],
        ],
        outputId: idOfItem.iron_axe,
        outputCount: 1,
        gridWidth: 2,
        gridHeight: 3
    },
    { // 木铲
        cells: [
            [{ itemId: idOfBlock.planks, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.wooden_shovel,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
    { // 石铲
        cells: [
            [{ itemId: idOfBlock.cobblestone, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.stone_shovel,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
    { // 铁铲
        cells: [
            [{ itemId: idOfItem.iron_ingot, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
            [{ itemId: idOfItem.stick, amount: 1 }],
        ],
        outputId: idOfItem.iron_shovel,
        outputCount: 1,
        gridWidth: 1,
        gridHeight: 3
    },
];

export { RecipeShape, recipes };