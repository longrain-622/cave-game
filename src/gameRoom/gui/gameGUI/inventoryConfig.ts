import { idOfItem } from "../../dropped/items.js";

interface InventoryConfig {
    cols: number; //列数
    rows: number;
    slotWidth: number; slotHeight: number; //每个格子的宽度px
    startX: number; startY: number; //第一个格子相对于背包图片左上角的偏移
    paddingX: number; paddingY: number; //格子之间的间距
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

//inventory
export const invenConfig = createConfig({startX: 32, startY: 336});
export const iC_hand = createConfig({rows: 1, startX: 32, startY: 568});
export const iC_clothe = createConfig({cols: 1, rows: 4, startX: 32, startY: 32});
export const iC_otherHand = createConfig({cols: 1, rows: 1, startX: 308, startY: 248});
export const iC_make = createConfig({cols: 2, rows: 2, startX: 392, startY: 72});
export const iC_get = createConfig({cols: 1, rows: 1, startX: 616, startY: 112});
//crafting table
export const ct_crafting = createConfig({cols: 3, rows: 3, startX: 120, startY: 68});
export const ct_get = createConfig({cols: 1, rows: 1, slotWidth: 96, slotHeight: 96, startX: 480, startY: 124});
//chest
export const chestConfig = createConfig({startX: 32, startY: 72});
//furnace
export const furnaceConfig_input = createConfig({cols: 1, rows: 1, startX: 224, startY: 68});
export const furnaceConfig_output = createConfig({cols: 1, rows: 1, startX: 448, startY: 124, slotWidth: 96, slotHeight: 96});
export const furnaceConfig_fuel = createConfig({cols: 1, rows: 1, startX: 224, startY: 212});

//槽位类
class Slots {
    item: number; num: number;
    durability: number;

    get max(): number { //堆叠上限
        switch(this.item) {
            case idOfItem.wooden_pickaxe: case idOfItem.stone_pickaxe:
                return 1;
                /*break;*/
            default: return 64; /*break;*/
        }
    }
    get mine_speed(): number {
        switch(this.item) {
            case idOfItem.wooden_pickaxe: return 0.18;
            case idOfItem.stone_pickaxe: return 0.10;
            default: return 1;
        }
    }

    constructor(item: number, num: number, durability: number=-1) {
        this.item = item; //存储的物品，空气为-1
        this.num = num; //所存储的物品的数量
        this.durability = durability; //耐久度，-1表示不需要该属性
    }
}

export const img_gui = {
    inventory: new Image(),
    widgets: new Image(),
    player: new Image(),
    icons: new Image(),
    crafting_table: new Image(),
    chest: new Image(),
    furnace: new Image(),
}
img_gui.inventory.src = 'assets/images/games/gui/container/inventory.png';
img_gui.widgets.src = 'assets/images/games/gui/widgets.png';
img_gui.player.src = 'assets/images/games/player/players.png';
img_gui.icons.src = 'assets/images/games/gui/hearts/icons.png';
img_gui.crafting_table.src = 'assets/images/games/gui/container/craftingtable.png';
img_gui.chest.src = 'assets/images/games/gui/shulker_box.png';
img_gui.furnace.src = 'assets/images/games/gui/furnace_gui.png';
const guiImages = [img_gui.inventory, img_gui.widgets, img_gui.player, img_gui.icons, img_gui.crafting_table, img_gui.chest, img_gui.furnace];
export let gui_isDrawing: boolean = false;
let imagesLoaded: number = 0;
function checkAllLoaded() {
    imagesLoaded++;
    if (imagesLoaded === guiImages.length) {
        gui_isDrawing = true;
    }
}
guiImages.forEach(img => img.addEventListener('load', checkAllLoaded));

export { Slots, InventoryConfig };
