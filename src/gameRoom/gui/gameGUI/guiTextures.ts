import * as PIXI from 'pixi.js';

// GUI 贴图资源表（alias -> 路径），通过 PixiJS Assets 加载
// 注意：players.png 由渲染层直接 BaseTexture.from 加载（共享同一实例），不在此重复加载
const guiAssets: Record<string, string> = {
    inventory: '/assets/images/games/gui/container/inventory.png',
    widgets: '/assets/images/games/gui/widgets.png',
    icons: '/assets/images/games/gui/hearts/icons.png',
    crafting_table: '/assets/images/games/gui/container/craftingtable.png',
    chest: '/assets/images/games/gui/shulker_box.png',
    furnace: '/assets/images/games/gui/furnace_gui.png',
};

// 加载后的 GUI 贴图纹理（按 alias 索引），供各 GUI 模块直接使用
export const guiTextures: Record<string, PIXI.Texture> = {};
export let gui_isDrawing: boolean = false;

function main(): void {
    // 用 PixiJS Assets 加载 GUI 贴图（替代 Image 对象），全部就绪后再填充 guiTextures
    PIXI.Assets.load<Record<string, PIXI.Texture>>(Object.values(guiAssets)).then((textures: Record<string, PIXI.Texture>) => {
        for (const [alias, url] of Object.entries(guiAssets)) {
            guiTextures[alias] = textures[url];
        }
        gui_isDrawing = true;
    }).catch((error: unknown) => {
        console.error('load gui textures error', error);
    });
}
main();
