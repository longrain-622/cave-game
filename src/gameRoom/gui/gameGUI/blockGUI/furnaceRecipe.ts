import { idOfBlock } from "../../../nature/blockMecha/blocks.js";
import { idOfItem } from "../../../dropped/itemIds.js";

export interface FurnaceRecipe {
    input: number;
    output: number;
    time: number; // 燃烧需要等待的时间
}

export const furnaceRecipes: FurnaceRecipe[] = [
    { input: idOfBlock.cobblestone, output: idOfBlock.stone, time: 256 },
    { input: idOfItem.raw_iron, output: idOfItem.iron_ingot, time: 512 },
    { input: idOfBlock.sand, output: idOfBlock.glass, time: 512 },
];

// 根据输入物品查找配方，找不到返回 undefined
export function getFurnaceRecipe(input: number): FurnaceRecipe | undefined {
    return furnaceRecipes.find(recipe => recipe.input === input);
}

// 燃料种类范围
export const fuels: number[] = [
    idOfBlock.planks, idOfBlock.oak,
    idOfBlock.chest, idOfBlock.crafting_table,
    idOfItem.coal, idOfItem.oak_door,
    idOfItem.stick, idOfItem.wooden_pickaxe,
];