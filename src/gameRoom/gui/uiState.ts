import { world } from "../const.js";
import { apioxEvent, ApioxMouseEvent } from "../../apiox/event.js";
import { mouse } from "../mouse.js";
import { craftingTable } from "./gameGUI/crafting_table.js";
import { idOfBlock } from "../nature/blockMecha/blockMechanism.js";

interface Uistate {
    invenUI_isOpening: boolean;
    gameContent_isOpening: boolean;
    chest_isOpening: boolean;
    furnace_isOpening: boolean;

    anyui_isOpening: Function;
    anyui_isOpening_except: Function;
}

export const uistate: Uistate = {
    invenUI_isOpening: false,
    gameContent_isOpening: false,
    chest_isOpening: false,
    furnace_isOpening: false,
    
    anyui_isOpening(): boolean {
        return (
            this.invenUI_isOpening ||
            this.gameContent_isOpening ||
            this.chest_isOpening ||
            this.furnace_isOpening
        );
    },

    anyui_isOpening_except(which_isOpening: boolean): boolean {
        return (
            this.anyui_isOpening() &&
            (!which_isOpening)
        );
    },
}

//控制由点击事件触发的 gui
apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
    if(ev.button !== 2) {return;}
    switch(world[mouse.world_y][mouse.world_x]) {
        case idOfBlock.crafting_table:
            if(uistate.anyui_isOpening_except(craftingTable.isOpening)) {return;}
            if(!craftingTable.isOpening) {
                craftingTable.isOpening = true;
            }
            break;
        case idOfBlock.chest:
            if(uistate.anyui_isOpening_except(uistate.chest_isOpening)) {return;}
            if(!uistate.chest_isOpening) {
                uistate.chest_isOpening = true;
            }
            break;
    }
});