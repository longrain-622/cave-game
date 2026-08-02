import { idOfBlock } from "../../../nature/blockMecha/blockMechanism.js";

export interface FurnaceRecipe {
    input: number;
    output: number;
    time: number; // 燃烧需要等待的时间
}

export const furnaceRecipes: FurnaceRecipe[] = [
    { input: idOfBlock.cobblestone, output: idOfBlock.stone, time: 100 }
];

// 根据输入物品查找配方，找不到返回 undefined
export function getFurnaceRecipe(input: number): FurnaceRecipe {
    return furnaceRecipes.find(recipe => recipe.input === input);
}
