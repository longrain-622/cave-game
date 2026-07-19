export const uistate = {
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
    }
}