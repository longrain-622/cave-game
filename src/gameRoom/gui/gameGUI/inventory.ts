import { room, point_coll_rect } from "../../const.js";
import { Inventory_config, invenConfig, iC_hand, Slots, iC_clothe, iC_otherHand, iC_make, iC_get } from "./inventoryConfig.js";
import { mouse } from "../../mouse.js";
import { checkBlock } from "../../rendering.js";
import { drawHeart, heartsAct } from "./hearts.js";
import { player } from "../../player.js";
import { checkItem } from "../../dropped/items.js";
import { craftingResultSlot, craftingSlots, updateCraftingResult, recipes, consumeCraftingMaterials } from "./crafting.js";
import { draw_craftingTable, craftingTable, handleWorkbenchClick, handleWorkbenchContextMenu, selectedWbType } from "./crafting_table.js";
import { apioxEvent, ApioxKeyboardEvent, ApioxMouseEvent, ApioxWheelEvent } from "../../../apiox/event.js";

//canvas
const canvas_gui = document.getElementById('gui') as HTMLCanvasElement;
$('#gui').css({
    'width': room.width + 'px',
    'height': room.height + 'px',
    'position': 'absolute',
    'left': '0',
    'top': '0'
});
canvas_gui.width = room.width;
canvas_gui.height = room.height;
const ctx_gui = canvas_gui.getContext('2d');
ctx_gui.fillStyle = '#ffffff';
ctx_gui.font = `28px "Unifont", "Microsoft YaHei", "SimHei", sans-serif`;
ctx_gui.shadowColor = 'black';
ctx_gui.imageSmoothingEnabled = false;
const img_gui = {
    inventory: new Image(),
    widgets: new Image(),
    player: new Image(),
    icons: new Image(),
    crafting_table: new Image(),
}
img_gui.inventory.src = 'assets/images/games/gui/container/inventory.png';
img_gui.widgets.src = 'assets/images/games/gui/widgets.png';
img_gui.player.src = 'assets/images/games/player/players.png';
img_gui.icons.src = 'assets/images/games/gui/hearts/icons.png';
img_gui.crafting_table.src = 'assets/images/games/gui/container/craftingtable.png';
const guiImages = [img_gui.inventory, img_gui.widgets, img_gui.player, img_gui.icons, img_gui.crafting_table];
let gui_isDrawing: boolean = false;
let imagesLoaded: number = 0;
function checkAllLoaded() {
    imagesLoaded++;
    if (imagesLoaded === guiImages.length) {
        gui_isDrawing = true;
    }
}
guiImages.forEach(img => img.addEventListener('load', checkAllLoaded));

//背包物品栏类
class Inventories {
    isOpening: boolean;
    items: Slots[]; //存储槽位对象的数组
    width: number; height: number; //屏幕上绘制的宽高

    constructor(isOpening: boolean, items: Slots[], width: number, height: number) {
        this.isOpening = isOpening; this.items = items;
        this.width = width; this.height = height;
    }

    initSlots(num: number) { //初始化槽位
        for(let i = 0; i < num; i++) {
            this.items.push(new Slots(-1, 0));
        }
    }
}
const inventory = new Inventories(false, [], 704, 664); //新建一个背包对象
inventory.initSlots(36);

//记录高亮格子对应的 inventory.items 索引（-1 表示没有高亮）
let selectedIndex: number = -1;
let selecting = new Slots(-1, 0); //正在选取中的物品
let isTriggered: boolean = false; // 状态锁

// 高亮对象 储存高亮有关属性
const highWhite: {
    x: number; y: number; screenX: number; screenY: number;
} = {
    x: 0, y: 0,
    screenX: 0, screenY: 0 //第一个格子相对于屏幕左上角的偏移
};
//物品栏对象
const widgets: {
    width: number; height: number; x: number; y: number; select: number;
} = {
    width: 760, height: 88,
    x: 0, y: 0,
    select: 0
};
widgets.x = (room.width - widgets.width) / 2;
widgets.y = room.height - widgets.height;

apioxEvent.onKeyDown((ev: ApioxKeyboardEvent) => {
    if (ev.key === 'e') {
        if (ev.repeat) {return;} //忽略按住重复触发的按键
        if (craftingTable.isOpening === true) {craftingTable.isOpening = false; return;}
        inventory.isOpening = !inventory.isOpening;
    }

    //键盘选取物品栏的物品
    const num = Number(ev.key);
    if(!isNaN(num) && num >= 1 && num <= 9 && ev.key.length === 1) {widgets.select = num - 1;}
});
apioxEvent.onWheel((event: ApioxWheelEvent) => {
    // deltaY > 0 向下滚动，< 0 向上滚动
    //滚动物品栏
    widgets.select += 1 * event.deltaY/Math.abs(event.deltaY);
    if(widgets.select > 8){widgets.select = 0;}
    else if(widgets.select < 0){widgets.select = 8;}
});
apioxEvent.onMouseDown((e: ApioxMouseEvent) => {
    if(isTriggered) {return;} //防重复

//左键部分
if(e.button === 0) {
    // 工作台优先
    if (craftingTable.isOpening) {
        handleWorkbenchClick(); //尝试处理工作台合成区域
        if (selectedWbType === null) { //未命中工作台区域 操作背包
            handleBackpackClick();
        }
        return;
    }

    if (!inventory.isOpening) {return;}

    // 优先处理合成区域
    if (selectedCraftingType !== null) {
        let targetSlot: Slots;
        if (selectedCraftingType === 'crafting') {
            targetSlot = craftingSlots[selectedCraftingIndex];
        } else {
            targetSlot = craftingResultSlot;
        }

        if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

        const mouseHasItem = (selecting.item !== -1);
        const targetHasItem = (targetSlot.item !== -1);

        // 鼠标空，目标有 -> 拿起
        if (!mouseHasItem && targetHasItem) {
            if (selectedCraftingType === 'result') {
                // 先记录结果槽的信息
                const outputId = targetSlot.item;
                const recipe = recipes.find(r => r.outputId === outputId);
                if (recipe) {
                    // 消耗原料（会内部更新结果槽）
                    const consumedTimes = consumeCraftingMaterials();
                    if (consumedTimes > 0) {
                        const takenCount = recipe.outputCount * consumedTimes;
                        selecting = new Slots(outputId, takenCount, targetSlot.max);
                    }
                }
            } else {
                // 普通合成槽或背包槽的处理
                selecting = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
                targetSlot.item = -1;
                targetSlot.num = 0;
                updateCraftingResult();
            }
            return;
        }
        // 鼠标有，目标空 -> 放下
        if (mouseHasItem && !targetHasItem) {
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting = new Slots(-1, 0);
            updateCraftingResult();
            return;
        }
        // 双方都有 -> 相同且可叠加则合并，否则交换
        if (mouseHasItem && targetHasItem) {
            if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
                targetSlot.num += selecting.num;
                selecting = new Slots(-1, 0);
            } else {
                const temp = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
                targetSlot.item = selecting.item;
                targetSlot.num = selecting.num;
                selecting = temp;
            }
            updateCraftingResult();
            return;
        }
        return;
    }

    if (selectedIndex === -1) {return;}

    const targetSlot = inventory.items[selectedIndex];
    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 1. 双方都空 → 无操作
    if (!mouseHasItem && !targetHasItem) {
        return;
    }

    // 2. 鼠标空，目标有 → 拿起
    if (!mouseHasItem && targetHasItem) {
        selecting = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
        targetSlot.item = -1;
        targetSlot.num = 0;
        return;
    }

    // 3. 鼠标有，目标空 → 放下
    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        selecting = new Slots(-1, 0);
        return;
    }

    // 4. 双方都有物品
    if (mouseHasItem && targetHasItem) {
        // 物品相同且可以叠加（叠加后不超过目标上限）
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            // 合并到目标格子，清空鼠标
            targetSlot.num += selecting.num;
            selecting = new Slots(-1, 0);
        } else {
            // 物品不同 或 相同但叠加会超过上限 → 交换
            const temp = new Slots(targetSlot.item, targetSlot.num, targetSlot.max);
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = temp.item;
            selecting.num = temp.num;
        }
    }
}

    //右键部分
if(e.button === 2) {
    e.preventDefault();
    if (craftingTable.isOpening) {
        handleWorkbenchContextMenu();
        if (selectedWbType === null) {
            handleBackpackContextMenu();
        }
        return;
    }

    if (!inventory.isOpening) {return;}

    //优先处理合成区域
    if (selectedCraftingType !== null) {
        let targetSlot: Slots;
        if (selectedCraftingType === 'crafting') {
            targetSlot = craftingSlots[selectedCraftingIndex];
        } else { // 'result'
            targetSlot = craftingResultSlot;
        }

        if (selectedCraftingType === 'result' && selecting.item !== -1) {return;}

        const mouseHasItem = (selecting.item !== -1);
        const targetHasItem = (targetSlot.item !== -1);

        // 情况1：鼠标上有物品，目标槽可放入单个（相同物品且未满，或目标空）
        if (mouseHasItem && (!targetHasItem || (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max))) {
            if (!targetHasItem) {
                targetSlot.item = selecting.item;
                targetSlot.num = 1;
            } else {
                targetSlot.num += 1;
            }
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
            if (selectedCraftingType === 'crafting') {
                updateCraftingResult();
            } else {
                updateCraftingResult();
            }
            return; // 关键：处理完后立即返回
        }

        // 情况2：鼠标空，目标有物品 → 拿起1个
        if (!mouseHasItem && targetHasItem) {
            if (selectedCraftingType === 'result') {
                const outputId = targetSlot.item;
                // 找到对应的配方，获取单次产出数量
                const recipe = recipes.find(r => r.outputId === outputId);
                if (recipe && targetSlot.num >= recipe.outputCount) {
                    const consumed = consumeCraftingMaterials(1);
                    if (consumed === 1) {
                        // 更新鼠标上的物品（拿取一份产物）
                        selecting = new Slots(outputId, recipe.outputCount, targetSlot.max);
                    }
                }
                return;
            } else {
                selecting = new Slots(targetSlot.item, 1, targetSlot.max);
                targetSlot.num -= 1;
                if (targetSlot.num === 0) {
                    targetSlot.item = -1;
                }
                updateCraftingResult();
            }
            return; // 关键：处理完后立即返回
        }

        // 其他情况（鼠标空且目标空，或鼠标有但目标满且不同物品）无操作，也要返回
        return;
    }

    if (selectedIndex === -1) {return;}

    const targetSlot = inventory.items[selectedIndex];
    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 鼠标空，目标有物品 → 拿起1个
    if (!mouseHasItem && targetHasItem) {
        selecting = new Slots(targetSlot.item, 1, targetSlot.max);
        targetSlot.num -= 1;
        if (targetSlot.num === 0) {
            targetSlot.item = -1;
        }
        return;
    }

    // 鼠标有物品，尝试放入1个
    if (mouseHasItem) {
        // 目标格子为空 → 放入一个
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
        }
        // 目标格子物品相同且未满 → 增加一个
        else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting = new Slots(-1, 0);
            }
        }
        // 其他情况（物品不同或已满）不做操作
    }
}
});
apioxEvent.onMouseUp(() => {
    isTriggered = false;
});

// 背包gui的行为
function drawText(text: string, x: number, y: number, fontSize: number = 28): void {
    ctx_gui.font = `${String(fontSize)}px "Unifont", "Microsoft YaHei", "SimHei", sans-serif`;

    ctx_gui.shadowOffsetX = 3;
    ctx_gui.shadowOffsetY = 3;

    ctx_gui.fillStyle = '#ffffff';
    ctx_gui.fillText(text, x, y);

    ctx_gui.shadowOffsetX = 0;
    ctx_gui.shadowOffsetY = 0;
}

//在背包或物品栏中绘制物品的函数
function drawIteminInventory(slotobj:Slots, x:number, y: number, width:number, height:number, fontx: number, fonty: number): void {
    checkBlock(ctx_gui, slotobj.item, x, y, width, height);
    checkItem(ctx_gui, slotobj.item, x, y, width, height);

    if(slotobj.num > 1) { //右下角绘制物品的数量
        let isMorethan10: number = 0;
        if(slotobj.num >= 10) {isMorethan10 = 1;}
        drawText(String(slotobj.num), fontx - 16*isMorethan10, fonty);
    }
}

function locateHighWhite(obj_IC: Inventory_config, inven_X: number, inven_Y: number): void {
    // 不再重置 selectedIndex
    highWhite.screenX = inven_X + obj_IC.startX;
    highWhite.screenY = inven_Y + obj_IC.startY;

    if (mouse.x >= highWhite.screenX && mouse.x <= highWhite.screenX + (obj_IC.slotWidth + obj_IC.paddingX) * obj_IC.cols &&
        mouse.y >= highWhite.screenY && mouse.y <= highWhite.screenY + (obj_IC.slotHeight + obj_IC.paddingY) * obj_IC.rows) {

        const col: number = Math.floor((mouse.x - highWhite.screenX) / (obj_IC.slotWidth + obj_IC.paddingX));
        const row: number = Math.floor((mouse.y - highWhite.screenY) / (obj_IC.slotHeight + obj_IC.paddingY));

        highWhite.x = highWhite.screenX + col * (obj_IC.slotWidth + obj_IC.paddingX);
        highWhite.y = highWhite.screenY + row * (obj_IC.slotHeight + obj_IC.paddingY);

        ctx_gui.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx_gui.fillRect(highWhite.x, highWhite.y, obj_IC.slotWidth, obj_IC.slotHeight);

        if (obj_IC.rows === 3 && obj_IC.cols === 9) {
            selectedIndex = 9 + row * obj_IC.cols + col;
        } else if (obj_IC.rows === 1 && obj_IC.cols === 9) {
            selectedIndex = row * obj_IC.cols + col;
        }
    }
}

let selectedCraftingType: 'crafting' | 'result' | null = null;
let selectedCraftingIndex: number = -1;  // 对于输出槽始终为0

function locateHighWhiteForCrafting(obj_IC: Inventory_config, invenX: number, invenY: number, slotsArray: Slots[], type: "crafting" | "result"): void {
    const startX: number = invenX + obj_IC.startX;
    const startY: number = invenY + obj_IC.startY;
    const slotW: number = obj_IC.slotWidth + obj_IC.paddingX;
    const slotH: number = obj_IC.slotHeight + obj_IC.paddingY;

    if (mouse.x >= startX && mouse.x <= startX + slotW * obj_IC.cols &&
        mouse.y >= startY && mouse.y <= startY + slotH * obj_IC.rows) {
        
        const col: number = Math.floor((mouse.x - startX) / slotW);
        const row: number = Math.floor((mouse.y - startY) / slotH);
        const idx: number = row * obj_IC.cols + col;
        if (idx < slotsArray.length) {
            selectedCraftingType = type;
            selectedCraftingIndex = idx;
            // 绘制高亮
            ctx_gui.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx_gui.fillRect(startX + col * slotW, startY + row * slotH, obj_IC.slotWidth, obj_IC.slotHeight);
        }
    }
}

function drawInventory(): void { //绘制
    selectedCraftingType = null; //重置变量
    selectedCraftingIndex = -1;

    //物品栏
    ctx_gui.drawImage(img_gui.widgets, 0, 0, 190, 22, widgets.x, widgets.y, widgets.width, widgets.height);
    ctx_gui.drawImage(img_gui.widgets, 0, 22, 24, 24, widgets.x - 4 + widgets.select*80, widgets.y - 4, 96, 96);
    for(let i = 0; i < invenConfig.cols; i++) { //物品栏上的物品
        const draw_width: number = 48, draw_height: number = 48;
        drawIteminInventory(inventory.items[i], widgets.x+13 + i*80 + 32 - draw_width/2, widgets.y-2 + widgets.height/4, draw_width, draw_height, widgets.x+64 + i*80, widgets.y + 76);
    }

    //绘制背包
    if(inventory.isOpening) {
        const invenX: number = (room.width-inventory.width) / 2;
        const invenY: number = (room.height-inventory.height) / 2;
        let draw_x: number = 0;
        let draw_y: number = 0;
        selectedIndex = -1; // 重置高亮索引

        ctx_gui.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx_gui.fillRect(0, 0, canvas_gui.width, canvas_gui.height);
        ctx_gui.drawImage(img_gui.inventory, 0, 0, 176, 166, invenX, invenY, inventory.width, inventory.height);

        //配方书图案
        const book_drawx = invenX + 428; const book_drawy = invenY + 244;
        if(point_coll_rect(mouse.x, mouse.y, book_drawx, book_drawy, 80, 72)) {
            ctx_gui.drawImage(img_gui.inventory, 178, 19, 20, 18, book_drawx, book_drawy, 80, 72);
        }
        else {
            ctx_gui.drawImage(img_gui.inventory, 178, 0, 20, 18, book_drawx, book_drawy, 80, 72);
        }

        locateHighWhite(invenConfig, invenX, invenY);
        locateHighWhite(iC_hand, invenX, invenY);
        locateHighWhite(iC_clothe, invenX, invenY);
        locateHighWhite(iC_otherHand, invenX, invenY);
        locateHighWhiteForCrafting(iC_make, invenX, invenY, craftingSlots, 'crafting');
        locateHighWhiteForCrafting(iC_get, invenX, invenY, [craftingResultSlot], 'result');

        //绘制背包物品栏格中的方块
        for(let i = 0; i < iC_hand.cols*iC_hand.rows; i++) {
            draw_x = invenX + iC_hand.startX + i*(iC_hand.slotWidth + iC_hand.paddingX);
            draw_y = invenY + iC_hand.startY;
            drawIteminInventory(inventory.items[i], draw_x + 8, draw_y + 8, 48, 48, draw_x + 48, draw_y + 64);
        }

        // 绘制背包主体（3行9列，索引从9开始）
        for (let row = 0; row < invenConfig.rows; row++) {
            for (let col = 0; col < invenConfig.cols; col++) {
                const slotIndex: number = 9 + row * invenConfig.cols + col;
                const draw_x: number = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX);
                const draw_y: number = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY);
                drawIteminInventory(inventory.items[slotIndex], draw_x + 8, draw_y + 8, 48, 48, draw_x + 48, draw_y + 64);
            }
        }

        // 绘制合成网格
        for (let i = 0; i < craftingSlots.length; i++) {
            const row: number = Math.floor(i / 2);
            const col: number = i % 2;
            const draw_x: number = invenX + iC_make.startX + col * (iC_make.slotWidth + iC_make.paddingX);
            const draw_y: number = invenY + iC_make.startY + row * (iC_make.slotHeight + iC_make.paddingY);
            drawIteminInventory(craftingSlots[i], draw_x + 8, draw_y + 8, 48, 48, draw_x + 48, draw_y + 64);
        }
        // 绘制输出槽
        const resX: number = invenX + iC_get.startX;
        const resY: number = invenY + iC_get.startY;
        drawIteminInventory(craftingResultSlot, resX + 8, resY + 8, 48, 48, resX + 48, resY + 64);

        // 绘制鼠标上拖拽的物品（跟随鼠标）
        if (selecting.item !== -1) {
            const draw_width: number = 48, draw_height: number = 48;
            drawIteminInventory(selecting, mouse.x - draw_width/2, mouse.y - draw_height/2, draw_width, draw_height, mouse.x + 16, mouse.y + 24);
        }

        // 背包中玩家的绘制（放大 1.6 倍）
        const scale: number = 1.6; let offsetx: number = -4, offsety: number = 16;
        ctx_gui.drawImage(img_gui.player, 8, 8, 8, 8, invenX+112*scale + offsetx, invenY+28*scale + offsety, 32*scale, 32*scale);
        ctx_gui.drawImage(img_gui.player, 20, 20, 8, 12, invenX+112*scale + offsetx, invenY+60*scale + offsety, 32*scale, 48*scale);
        ctx_gui.drawImage(img_gui.player, 44, 20, 4, 12, invenX+144*scale + offsetx, invenY+60*scale + offsety, 16*scale, 48*scale);
        ctx_gui.drawImage(img_gui.player, 36, 52, 4, 12, invenX+96*scale + offsetx, invenY+60*scale + offsety, 16*scale, 48*scale);
        ctx_gui.drawImage(img_gui.player, 20, 52, 4, 12, invenX+112*scale + offsetx, invenY+108*scale + offsety, 16*scale, 48*scale);
        ctx_gui.drawImage(img_gui.player, 20, 52, 4, 12, invenX+128*scale + offsetx, invenY+108*scale + offsety, 16*scale, 48*scale);
    }
}

function pickupObj(item: number): void { //拾取物品
    //找到空格
    let targetSlot: number = 0;
    while((inventory.items[targetSlot].item !== -1 && inventory.items[targetSlot].item !== item)
    || inventory.items[targetSlot].num >= inventory.items[targetSlot].max) {
        targetSlot += 1;
        if(targetSlot >= inventory.items.length - 1) {return;}
    }

    //拾取
    inventory.items[targetSlot].item = item;
    inventory.items[targetSlot].num += 1;
    return;
}

export let invenUI_isOpening: boolean = false;
function inventoryLoop() {
    if(player.hp > 0) {
        invenUI_isOpening = inventory.isOpening || craftingTable.isOpening;
        heartsAct();
        drawHeart();
        drawInventory();
        draw_craftingTable();
    }
}

//供工作台调用的背包绘制函数
export function drawBackpackItems(invenX: number, invenY: number): void {
    // 热键栏物品（9格）
    const draw_width: number = 48, draw_height: number = 48;
    for (let i = 0; i < invenConfig.cols; i++) {
        let draw_x: number = invenX + iC_hand.startX + i*(iC_hand.slotWidth + iC_hand.paddingX);
        let draw_y: number = invenY + iC_hand.startY;
        drawIteminInventory(
            inventory.items[i],
            draw_x + 8,
            draw_y + 8,
            draw_width, draw_height,
            draw_x + 48,
            draw_y + 64
        );
    }

    // 背包主体（3行9列，索引从9开始）
    for (let row = 0; row < invenConfig.rows; row++) {
        for (let col = 0; col < invenConfig.cols; col++) {
            const slotIndex: number = 9 + row * invenConfig.cols + col;
            const draw_x: number = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX);
            const draw_y: number = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY);
            drawIteminInventory(
                inventory.items[slotIndex],
                draw_x + 8, draw_y + 8, 48, 48,
                draw_x + 48, draw_y + 64
            );
        }
    }
}

// 背包左键点击逻辑（从原 click 事件中提取）
export function handleBackpackClick(): void {
    if (selectedIndex === -1) {return;}
    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    if (!mouseHasItem && !targetHasItem) {return;}

    if (!mouseHasItem && targetHasItem) {
        selecting.item = targetSlot.item;
        selecting.num = targetSlot.num;
        targetSlot.item = -1;
        targetSlot.num = 0;
        return;
    }

    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        selecting.item = -1;
        selecting.num = 0;
        return;
    }

    if (mouseHasItem && targetHasItem) {
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            targetSlot.num += selecting.num;
            selecting.item = -1;
            selecting.num = 0;
        } else {
            const tempItem: number = targetSlot.item, tempNum: number = targetSlot.num;
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = tempItem;
            selecting.num = tempNum;
        }
    }
}

// 背包右键点击逻辑
export function handleBackpackContextMenu(): void {
    if (selectedIndex === -1) {return;}
    const targetSlot: Slots = inventory.items[selectedIndex];
    const mouseHasItem: boolean = (selecting.item !== -1);
    const targetHasItem: boolean = (targetSlot.item !== -1);

    if (!mouseHasItem && targetHasItem) {
        selecting.item = targetSlot.item;
        selecting.num = 1;
        targetSlot.num -= 1;
        if (targetSlot.num === 0) {targetSlot.item = -1;}
        return;
    }

    if (mouseHasItem) {
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
        } else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
        }
    }
}

export { inventoryLoop, pickupObj, locateHighWhite, drawText, drawIteminInventory, inventory, widgets, ctx_gui, img_gui, gui_isDrawing, selecting, canvas_gui };
