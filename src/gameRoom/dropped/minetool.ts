import { Blocks, blocksArray, idOfBlock } from "../nature/blockMecha/blocks.js";
import { inventory, widgets } from "../gui/gameGUI/inventory.js";
import { idOfItem } from "./items.js";

function getBlockHardnessById(blockId: number): number {
    let left: number = 0;
    let right: number = blocksArray.length - 1;
    while (left <= right) {
        const mid: number = Math.floor((left + right) / 2);
        const block: Blocks = blocksArray[mid];
        if (block.id === blockId) {
            return block.hardness;
        } else if (block.id < blockId) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return 0; //未找到返回0硬度
}

export function calculateHardness(id: number): number { //根据工具等计算方块硬度
    switch(id) {
        case idOfBlock.stone: case idOfBlock.cobblestone: case idOfBlock.sandstone:
        case idOfBlock.iron_ore: case idOfBlock.coal_ore:
        case idOfBlock.furnace:
        case idOfBlock.andesite: case idOfBlock.diorite: case idOfBlock.granite:
            switch(inventory.items[widgets.select].item) {
                case idOfItem.wooden_pickaxe: case idOfItem.stone_pickaxe: case idOfItem.iron_pickaxe:
                    return getBlockHardnessById(id) * inventory.items[widgets.select].mine_speed;
                    //break;
            }
            break;
        default: return getBlockHardnessById(id);
    }
    return getBlockHardnessById(id);
}
