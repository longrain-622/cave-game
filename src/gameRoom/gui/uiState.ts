interface Uistate {
    inventory_isOpening: boolean;
    craftingTable_isOpening: boolean;
    gameContent_isOpening: boolean;
    chest_isOpening: boolean;
    furnace_isOpening: boolean;

    invenUI_isOpening: () => boolean; //与物品栏相关的ui的打开状态
    anyui_isOpening: () => boolean; //是否有ui打开
    anyui_isOpening_except: (which_isOpening: boolean) => boolean; //除了xxx关闭以外是否有其他ui打开
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