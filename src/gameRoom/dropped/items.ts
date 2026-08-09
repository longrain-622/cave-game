import { player } from "../player.js";
import { idOfItem, itemTextures, item_isDrawing } from './itemIds.js';
export { idOfItem, itemTextures, item_isDrawing };
import { Slots } from "../gui/gameGUI/inventoryConfig.js";
import { idOfBlock } from "../nature/blockMecha/blocks.js";
import { isOutOfBounds, setWorldState, world } from "../world.js";
import { mouse } from "../mouse.js";
import { createDrop } from "./droppedItem.js";

function putDoor(doorId: number): void {
    let doorBlockId_b: number;
    let doorBlockId_t: number;

    switch (doorId) {
        case idOfItem.oak_door: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;
    }

    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x) && world[mouse.world_y - 1][mouse.world_x] === idOfBlock.air) {
        setWorldState({ x: mouse.world_x, y: mouse.world_y }, { type: doorBlockId_b });
        setWorldState({ x: mouse.world_x, y: mouse.world_y - 1 }, { type: doorBlockId_t });
    } else {
        createDrop(doorId, mouse.world_x * 64, mouse.world_y * 64);
    }
}

function useItem(item: Slots): Slots { // 使用物品栏中的物品
    let plusHp: number = 0;

    switch (item.item) {
        case idOfItem.beef: plusHp = 3; break;
        case idOfItem.chicken: plusHp = 2; break;
        case idOfItem.mutton: plusHp = 2; break;
        case idOfItem.porkchop: plusHp = 3; break;
        case idOfItem.apple: plusHp = 4; break;
        default: plusHp = 0; break;
    }

    if (plusHp !== 0) {
        player.hp += plusHp;
        if (player.hp > 20) {player.hp = 20;}
        item.num--;
    }

    if (item.num <= 0) {return new Slots(-1, 0);}
    else {return item;}
}

export { useItem, putDoor };
