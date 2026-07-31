import { idOfBlock } from "../../../nature/blockMecha/blockMechanism.js";
import { idOfItem } from "../../../dropped/items.js";

interface FurnaceRecipe {
    input: number;
    output: number;
    time: number; // 燃烧需要等待的时间
}

const furnaceRecipes: FurnaceRecipe[] = [
    { input: idOfBlock.cobblestone, output: idOfBlock.stone, time: 100 }
];