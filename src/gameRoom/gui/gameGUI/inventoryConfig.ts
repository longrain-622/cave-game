import { idOfItem } from "../../dropped/items.js";
import * as PIXI from 'pixi.js';

interface InventoryConfig {
    cols: number; // 列数
    rows: number;
    slotWidth: number; slotHeight: number; // 每个格子的宽度px
    startX: number; startY: number; // 第一个格子相对于背包图片左上角的偏移
    paddingX: number; paddingY: number; // 格子之间的间距
}
const defaultConfig: InventoryConfig = {
    cols: 9, rows: 3,
    slotWidth: 64, slotHeight: 64,
    startX: 0, startY: 0,
    paddingX: 8, paddingY: 8
};
function createConfig(overrides: Partial<InventoryConfig>): InventoryConfig {
    return { ...defaultConfig, ...overrides };
}

// inventory
export const invenConfig = createConfig({startX: 32, startY: 336});
export const iC_hand = createConfig({rows: 1, startX: 32, startY: 568});
export const iC_clothe = createConfig({cols: 1, rows: 4, startX: 32, startY: 32});
export const iC_otherHand = createConfig({cols: 1, rows: 1, startX: 308, startY: 248});
export const iC_make = createConfig({cols: 2, rows: 2, startX: 392, startY: 72});
export const iC_get = createConfig({cols: 1, rows: 1, startX: 616, startY: 112});
// crafting table
export const ct_crafting = createConfig({cols: 3, rows: 3, startX: 120, startY: 68});
export const ct_get = createConfig({cols: 1, rows: 1, slotWidth: 96, slotHeight: 96, startX: 480, startY: 124});
// chest
export const chestConfig = createConfig({startX: 32, startY: 72});
// furnace
export const furnaceConfig_input = createConfig({cols: 1, rows: 1, startX: 224, startY: 68});
export const furnaceConfig_output = createConfig({cols: 1, rows: 1, startX: 448, startY: 124, slotWidth: 96, slotHeight: 96});
export const furnaceConfig_fuel = createConfig({cols: 1, rows: 1, startX: 224, startY: 212});

// 槽位类
class Slots {
    item: number; num: number;
    durability: number;

    get max(): number { // 堆叠上限
        switch (this.item) {
            case idOfItem.wooden_pickaxe: case idOfItem.stone_pickaxe: case idOfItem.iron_pickaxe:
            case idOfItem.wooden_sword: case idOfItem.stone_sword: case idOfItem.iron_sword:
            case idOfItem.wooden_axe: case idOfItem.stone_axe: case idOfItem.iron_axe:
            case idOfItem.wooden_shovel: case idOfItem.stone_shovel: case idOfItem.iron_shovel:
                return 1;
            default: return 64;
        }
    }

    get mine_speed(): number {
        switch (this.item) {
            case idOfItem.wooden_pickaxe: return 0.18;
            case idOfItem.stone_pickaxe: return 0.10;
            case idOfItem.iron_pickaxe: return 0.06;
            case idOfItem.wooden_axe:
            case idOfItem.wooden_shovel:
                return 0.5;
            case idOfItem.stone_axe:
            case idOfItem.stone_shovel:
                return 0.25;
            case idOfItem.iron_axe:
            case idOfItem.iron_shovel:
                return 0.16;
            default: return 1;
        }
    }

    constructor(item: number, num: number, durability: number=-1) {
        this.item = item; // 存储的物品，空气为-1
        this.num = num; // 所存储的物品的数量
        this.durability = durability; // 耐久度，-1表示不需要该属性
    }
}

// GUI 贴图资源表（alias -> 路径），通过 PixiJS Assets 加载
// 注意：players.png 由 player.ts 直接 BaseTexture.from 加载（共享同一实例），不在此重复加载
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

export { Slots, InventoryConfig };
