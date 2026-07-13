import { idOfItem } from "../../dropped/items.js";

class Inventory_config {
    cols: number; rows: number;
    slotWidth: number; slotHeight: number;
    startX: number; startY: number;
    paddingX: number; paddingY:number;

    constructor(cols: number=9, rows: number=3,
    slotWidth: number=64, slotHeight: number=64,
    startX: number, startY: number,
    paddingX: number=8, paddingY: number=8) {
        this.cols = cols; //列数（36个槽位，如果是4x9）
        this.rows = rows;
        this.slotWidth = slotWidth; //每个格子的宽度（像素）
        this.slotHeight = slotHeight;
        this.startX = startX; //第一个格子相对于背包图片左上角的X偏移
        this.startY = startY; //第一个格子相对于背包图片左上角的Y偏移
        this.paddingX = paddingX; //格子之间的水平间距
        this.paddingY = paddingY;
    }
}

export const invenConfig = new Inventory_config(9, 3, 64, 64, 32, 336, 8, 8);
export const iC_hand = new Inventory_config(9, 1, 64, 64, 32, 568, 8, 8);
export const iC_clothe = new Inventory_config(1, 4, 64, 64, 32, 32, 8, 8);
export const iC_otherHand = new Inventory_config(1, 1, 64, 64, 308, 248);
export const iC_make = new Inventory_config(2, 2, 64, 64, 392, 72, 8, 8);
export const iC_get = new Inventory_config(1, 1, 64, 64, 616, 112);

//crafting table
export const ct_crafting = new Inventory_config(3, 3, 64, 64, 120, 68);
export const ct_get = new Inventory_config(1, 1, 96, 96, 480, 124);

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

export { Slots, Inventory_config };
