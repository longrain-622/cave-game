import { world } from "../const.js";
import { apioxEvent, ApioxMouseEvent } from "../../apiox/event.js";
import { mouse } from "../mouse.js";
import { idOfBlock } from "../nature/blockMecha/blockMechanism.js";

interface Uistate {
    inventory_isOpening: boolean;
    craftingTable_isOpening: boolean;
    gameContent_isOpening: boolean;
    chest_isOpening: boolean;
    furnace_isOpening: boolean;

    invenUI_isOpening: Function; //与物品栏相关的ui的打开状态
    anyui_isOpening: Function; //是否有ui打开
    anyui_isOpening_except: Function; //除了xxx关闭以外是否有其他ui打开
}

export const uistate: Uistate = {
    inventory_isOpening: false,
    craftingTable_isOpening: false,
    gameContent_isOpening: false,
    chest_isOpening: false,
    furnace_isOpening: false,

    invenUI_isOpening(): boolean {
        return (
            this.inventory_isOpening ||
            this.craftingTable_isOpening ||
            this.chest_isOpening ||
            this.furnace_isOpening
        );
    },
    
    anyui_isOpening(): boolean {
        return (
            this.inventory_isOpening ||
            this.craftingTable_isOpening ||
            this.gameContent_isOpening ||
            this.chest_isOpening ||
            this.furnace_isOpening
        );
    },

    anyui_isOpening_except(which_isOpening: boolean): boolean { //
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
            if(uistate.anyui_isOpening_except(uistate.craftingTable_isOpening)) {return;}
            if(!uistate.craftingTable_isOpening) {
                uistate.craftingTable_isOpening = true;
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