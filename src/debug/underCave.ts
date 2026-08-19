import { idOfItem } from "../gameRoom/dropped/itemIds.js";
import { inventory } from "../gameRoom/gui/gameGUI/inventory.js";
import { Slots } from "../gameRoom/gui/gameGUI/inventoryConfig.js";
import { player } from "../gameRoom/player.js";
import { apioxEvent } from "../apiox/event.js";

const doit: boolean = false;

function goToUnderCave(): void {
    player.y = 250 * 64;
    inventory.items[0] = new Slots(idOfItem.iron_pickaxe, 1);
}

function main(): void {
    if (!doit) {return;}
    apioxEvent.onKeyDown((e) => {
        if (e.key !== 't') {return;}
        goToUnderCave();
    });
}
main();