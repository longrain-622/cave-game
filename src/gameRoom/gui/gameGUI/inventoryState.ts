import { room } from "../../../constants/generic.js";
import { Slots } from "./inventoryConfig.js";
import { readingWorld, coverWhenSave } from "../../gameState.js";

//背包对象
interface Inventories {
    items: Slots[]; //存储槽位对象的数组
    width: number; height: number; //屏幕上绘制的宽高
    initSlots: (num: number) => void; //初始化槽位
}

const inventory: Inventories = {
    items: [],
    width: 704, height: 664,
    initSlots(num: number) {
        for (let i = 0; i < num; i++) {
            this.items.push(new Slots(-1, 0));
        }
    },
};

//物品栏对象
interface Widgets {
    width: number; height: number;
    x: number; y: number;
    select: number;
}

const widgets: Widgets = {
    width: 760, height: 88,
    x: 0, y: 0,
    select: 0
};

widgets.x = (room.width - widgets.width) / 2;
widgets.y = room.height - widgets.height;

function pickupObj(item: number): void { //拾取物品
    //找到空格
    let targetSlot: number = 0;
    while ((inventory.items[targetSlot].item !== -1 && inventory.items[targetSlot].item !== item)
    || inventory.items[targetSlot].num >= inventory.items[targetSlot].max) {
        targetSlot += 1;
        if (targetSlot >= inventory.items.length - 1) {return;}
    }

    //拾取
    inventory.items[targetSlot].item = item;
    inventory.items[targetSlot].num += 1;
    return;
}

//初始化背包
if (coverWhenSave && readingWorld !== null) {
    for (let i = 0; i < readingWorld.inventory.items.length; i++) {
        const readSlot = readingWorld.inventory.items[i];
        const putSlot = new Slots(readSlot.item, readSlot.num, readSlot.durability);
        inventory.items.push(putSlot);
    }
    while (inventory.items.length < 36) {
        inventory.initSlots(1);
    }
} else {
    inventory.initSlots(36);
}

export { pickupObj, inventory, widgets };
