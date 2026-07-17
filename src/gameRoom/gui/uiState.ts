export const uistate = {
    invenUI_isOpening: false,
    gameContent_isOpening: false,
    
    anyui_isOpening(): boolean {
        return this.invenUI_isOpening || this.gameContent_isOpening;
    }
}