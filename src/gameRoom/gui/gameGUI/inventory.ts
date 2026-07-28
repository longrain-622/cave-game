import { room } from "../../../constants/generic.js";
import { img_gui, gui_isDrawing, InventoryConfig, invenConfig, iC_hand, Slots, iC_make, iC_get, iC_clothe, iC_otherHand } from "./inventoryConfig.js";
import { mouse } from "../../mouse.js";
import { drawHeart, heartsAct } from "./hearts.js";
import { player } from "../../player.js";
import { craftingResultSlot, craftingSlots, updateCraftingResult, recipes, consumeCraftingMaterials } from "./crafting.js";
import { draw_craftingTable, handleWorkbenchClick, handleWorkbenchContextMenu, selectedWbType } from "./crafting_table.js";
import { apioxEvent, ApioxKeyboardEvent, ApioxMouseEvent, ApioxWheelEvent } from "../../../apiox/event.js";
import { guiApp } from "../application.js";
import { uistate } from "../uiState.js";
import { genericTextStyle, blockTextures } from "../../rendering.js";
import { itemTextures } from "../../dropped/items.js";
import { draw_chest, handleChestClick, handleChestContextMenu, getChestSelectedIndex, handleChestBackpackClick, handleChestBackpackContextMenu } from "./chest.js";
import { readingWorld, coverWhenSave } from "../../gameState.js";
import * as PIXI from 'pixi.js';

//背包物品栏类
class Inventories {
    items: Slots[]; //存储槽位对象的数组
    width: number; height: number; //屏幕上绘制的宽高

    constructor(items: Slots[], width: number, height: number) {
        this.items = items;
        this.width = width; this.height = height;
    }

    initSlots(num: number) { //初始化槽位
        for(let i = 0; i < num; i++) {
            this.items.push(new Slots(-1, 0));
        }
    }
}
const inventory: Inventories = new Inventories([], 704, 664); //新建一个背包对象

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

//pixiJS
const invenX: number = (room.width - inventory.width) / 2;
const invenY: number = (room.height - inventory.height) / 2;
const item_width: number = 48, item_height: number = 48;
export const guiContainer = new PIXI.Container();
//各 UI 模块容器
const inventoryContainer = new PIXI.Container();
const heartContainer = new PIXI.Container();
const craftingTableContainer = new PIXI.Container();
const deathContainer = new PIXI.Container();
const widgetContainer = new PIXI.Container();
const floatContainer = new PIXI.Container();
guiContainer.addChild(inventoryContainer, heartContainer, craftingTableContainer, deathContainer, floatContainer);
guiContainer.sortableChildren = true;
guiContainer.zIndex = 9;
//默认隐藏
inventoryContainer.visible = false; inventoryContainer.zIndex = 2;
heartContainer.visible = true; heartContainer.zIndex = 0;
craftingTableContainer.visible = false; craftingTableContainer.zIndex = 3;
deathContainer.visible = false; deathContainer.zIndex = 4;
widgetContainer.visible = true; //widgetContainer E guiApp
floatContainer.zIndex = 10;
//背包 UI 元素
//let widgetHighlight: PIXI.Sprite; //选中格子高亮（使用 widgets.png 中的选择框）
let blackBg: PIXI.Graphics;
let inventoryBg: PIXI.Sprite; //背包背景
let widgetBg: PIXI.Sprite; //底部物品栏背景
let widgetSelectHighlight: PIXI.Sprite; //物品栏选中高亮（来自 widgets.png 的选择框）
let widgetSlotSprites: PIXI.Sprite[] = [];
let widgetSlotTexts: PIXI.Text[] = [];
let slotSprites: PIXI.Sprite[] = [];  //36个槽位的图标
let slotTexts: PIXI.Text[] = []; //36个槽位的数量文本
let craftingSlotSprites: PIXI.Sprite[] = []; //合成网格（4个）
let craftingSlotTexts: PIXI.Text[] = [];
let craftingResultSprite: PIXI.Sprite;
let craftingResultText: PIXI.Text;
let playerPreviewContainer: PIXI.Container; //背包中的玩家预览（原 canvas 绘制人物部分）
let highlightGraphics: PIXI.Graphics; //鼠标悬停高亮（通用）
let selectingSprite: PIXI.Sprite; //鼠标拖拽物品图标
let selectingText: PIXI.Text; //鼠标拖拽物品数量
let bookSprite: PIXI.Sprite; //配方书按钮

//用于工作台显示的背包槽位（独立于 inventoryContainer）
let wbSlotSprites: PIXI.Sprite[] = [];
let wbSlotTexts: PIXI.Text[] = [];
let wbInitialized = false;

export function initInventoryUI() {
    //如果已经添加过，避免重复
    if(!guiContainer.parent) {
        guiApp.stage.addChild(guiContainer);
        guiContainer.addChild(inventoryContainer, heartContainer, craftingTableContainer, deathContainer);
    }
    if(!widgetContainer.parent) {
        guiApp.stage.addChild(widgetContainer);
        widgetContainer.zIndex = 8;
    }

    //清空容器避免重复初始化
    inventoryContainer.removeChildren();
    widgetContainer.removeChildren();

    const widgetTex: PIXI.BaseTexture = PIXI.Texture.from(img_gui.widgets).baseTexture;
    const widgetBgTex: PIXI.Texture = new PIXI.Texture(widgetTex, new PIXI.Rectangle(0, 0, 190, 22));
    const widgetSelectTex: PIXI.Texture = new PIXI.Texture(widgetTex, new PIXI.Rectangle(0, 22, 24, 24));

    //物品栏背景
    widgetBg = new PIXI.Sprite(widgetBgTex);
    widgetBg.width = widgets.width;
    widgetBg.height = widgets.height;
    widgetBg.position.set(widgets.x, widgets.y);
    widgetContainer.addChild(widgetBg);

    //物品栏选中高亮
    widgetSelectHighlight = new PIXI.Sprite(widgetSelectTex);
    widgetSelectHighlight.width = 96;
    widgetSelectHighlight.height = 96;
    widgetSelectHighlight.position.set(widgets.x - 4 + widgets.select * 80, widgets.y - 4);
    widgetContainer.addChild(widgetSelectHighlight);

    const invenTex: PIXI.BaseTexture = PIXI.Texture.from(img_gui.inventory).baseTexture;
    const invenBgTex: PIXI.Texture = new PIXI.Texture(invenTex, new PIXI.Rectangle(0, 0, 176, 166));

    blackBg = new PIXI.Graphics();
    blackBg.beginFill(0x000000, 0.5);
    blackBg.drawRect(0, 0, room.width, room.height);
    blackBg.visible = true;
    inventoryContainer.addChild(blackBg);

    //背包背景
    inventoryBg = new PIXI.Sprite(invenBgTex);
    inventoryBg.width = inventory.width;
    inventoryBg.height = inventory.height;
    inventoryBg.position.set(invenX, invenY);
    inventoryBg.visible = true;
    inventoryContainer.addChild(inventoryBg);

    //创建底部热键栏
    for (let i = 0; i < iC_hand.cols; i++) {
        const x: number = widgets.x + 13 + i * 80 + 32 - 24;
        const y: number = widgets.y - 2 + widgets.height / 4;
        //创建精灵并添加到 widgetContainer
        const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 48; sprite.height = 48;
        sprite.position.set(x, y);
        sprite.visible = false;
        widgetContainer.addChild(sprite);
        widgetSlotSprites.push(sprite);

        const text = new PIXI.Text('', genericTextStyle());
        text.style.fontSize = 28;
        text.anchor.set(1, 1);
        text.position.set(x + 54, y + 54);
        text.visible = false;
        widgetContainer.addChild(text);
        widgetSlotTexts.push(text);
    }

    //创建背包内的 36 个槽位
    //先清空 slotSprites/slotTexts（避免残留）
    slotSprites = [];
    slotTexts = [];

    const width: number = 48, height: number = 48;
    //背包热键栏（9格，索引 0~8）
    for (let i = 0; i < iC_hand.cols; i++) {
        const x: number = invenX + iC_hand.startX + i * (iC_hand.slotWidth + iC_hand.paddingX) + 8;
        const y: number = invenY + iC_hand.startY + 8;
        const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = width; sprite.height = height;
        sprite.position.set(x, y);
        sprite.visible = false;
        inventoryContainer.addChild(sprite);
        slotSprites.push(sprite);

        const text = new PIXI.Text('', genericTextStyle());
        text.style.fontSize = 28;
        text.anchor.set(1, 1);
        text.position.set(x + width + 4, y + height + 4);
        text.visible = false;
        inventoryContainer.addChild(text);
        slotTexts.push(text);
    }

    //背包主体（27格，索引 9~35）
    for (let row = 0; row < invenConfig.rows; row++) {
        for (let col = 0; col < invenConfig.cols; col++) {
            const x: number = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX) + 8;
            const y: number = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY) + 8;
            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = width; sprite.height = height;
            sprite.position.set(x, y);
            sprite.visible = false;
            inventoryContainer.addChild(sprite);
            slotSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.position.set(x + width + 4, y + height + 4);
            text.visible = false;
            inventoryContainer.addChild(text);
            slotTexts.push(text);
        }
    }

    //合成网格（4个槽位）
    for(let i = 0; i < 4; i++) {
        const row: number = Math.floor(i / 2);
        const col: number = i % 2;
        const x: number = invenX + iC_make.startX + col * (iC_make.slotWidth + iC_make.paddingX) + 8;
        const y: number = invenY + iC_make.startY + row * (iC_make.slotHeight + iC_make.paddingY) + 8;
        const sprite: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 48;
        sprite.height = 48;
        sprite.position.set(x, y);
        sprite.visible = false;
        inventoryContainer.addChild(sprite);
        craftingSlotSprites.push(sprite);

        const text: PIXI.Text = new PIXI.Text('', genericTextStyle());
        text.style.fontSize = 28;
        text.anchor.set(1, 1);
        text.position.set(x + width + 4, y + height + 4);
        text.visible = false;
        inventoryContainer.addChild(text);
        craftingSlotTexts.push(text);
    }

    //合成输出槽
    const resX: number = invenX + iC_get.startX + 8;
    const resY: number = invenY + iC_get.startY + 8;
    craftingResultSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    craftingResultSprite.width = 48;
    craftingResultSprite.height = 48;
    craftingResultSprite.position.set(resX, resY);
    craftingResultSprite.visible = false;
    inventoryContainer.addChild(craftingResultSprite);

    craftingResultText = new PIXI.Text('', genericTextStyle());
    craftingResultText.style.fontSize = 28;
    craftingResultText.anchor.set(1, 1);
    craftingResultText.position.set(resX + width + 4, resY + height + 4);
    craftingResultText.visible = false;
    inventoryContainer.addChild(craftingResultText);

    //配方书按钮
    bookSprite = new PIXI.Sprite(PIXI.Texture.from(img_gui.inventory));
    bookSprite.texture.frame = new PIXI.Rectangle(178, 0, 20, 18);
    bookSprite.width = 80;
    bookSprite.height = 72;
    bookSprite.position.set(invenX + 428, invenY + 244);
    bookSprite.visible = false;
    inventoryContainer.addChild(bookSprite);

    // 玩家预览（用多个 Sprite 组装）
    playerPreviewContainer = new PIXI.Container();
    playerPreviewContainer.visible = false;
    const scale: number = 1.6;
    const offsetx: number = -4, offsety: number = 16;
    const baseX: number = invenX + 112 * scale + offsetx;
    const baseY: number = invenY + 28 * scale + offsety;
    const playerBaseTex = PIXI.Texture.from(img_gui.player).baseTexture;//获取玩家纹理的基础纹理（避免帧覆盖）
    function createPlayerPart(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): PIXI.Sprite {
        //辅助函数：创建身体部位的 Sprite
        const tex = new PIXI.Texture(playerBaseTex, new PIXI.Rectangle(sx, sy, sw, sh));
        const sprite = new PIXI.Sprite(tex);
        sprite.position.set(dx, dy);
        sprite.width = dw;
        sprite.height = dh;
        return sprite;
    }
    playerPreviewContainer.addChild(createPlayerPart(8, 8, 8, 8, baseX, baseY, 32 * scale, 32 * scale)); //头
    playerPreviewContainer.addChild(createPlayerPart(20, 20, 8, 12, baseX, baseY + 32 * scale, 32 * scale, 48 * scale)); //身体
    playerPreviewContainer.addChild(createPlayerPart(44, 20, 4, 12, baseX + 32 * scale, baseY + 32 * scale, 16 * scale, 48 * scale)); //右手
    playerPreviewContainer.addChild(createPlayerPart(36, 52, 4, 12, baseX - 16 * scale, baseY + 32 * scale, 16 * scale, 48 * scale)); //左手
    playerPreviewContainer.addChild(createPlayerPart(20, 52, 4, 12, baseX, baseY + 80 * scale, 16 * scale, 48 * scale)); //左腿
    playerPreviewContainer.addChild(createPlayerPart(20, 52, 4, 12, baseX + 16 * scale, baseY + 80 * scale, 16 * scale, 48 * scale)); //右腿
    inventoryContainer.addChild(playerPreviewContainer);

    //高亮图形（透明矩形）
    highlightGraphics = new PIXI.Graphics();
    highlightGraphics.visible = false;
    inventoryContainer.addChild(highlightGraphics);

    //鼠标拖拽物品
    selectingSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    selectingSprite.width = 48;
    selectingSprite.height = 48;
    selectingSprite.visible = false;
    floatContainer.addChild(selectingSprite);

    selectingText = new PIXI.Text('', genericTextStyle());
    selectingText.style.fontSize = 28;
    selectingText.anchor.set(1, 1);
    selectingText.visible = false;
    floatContainer.addChild(selectingText);
}

apioxEvent.onKeyDown((ev: ApioxKeyboardEvent) => {
    if (ev.key === 'e') {
        if(ev.repeat) {return;}
        if(uistate.craftingTable_isOpening) {uistate.craftingTable_isOpening = false; return;}
        if(uistate.chest_isOpening) {uistate.chest_isOpening = false; return;}
        if(uistate.anyui_isOpening_except(uistate.inventory_isOpening)) {return;}
        uistate.inventory_isOpening = !uistate.inventory_isOpening;
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
        //工作台优先
        if (uistate.craftingTable_isOpening) {
            handleWorkbenchClick(); //尝试处理工作台合成区域
            if (selectedWbType === null) { //未命中工作台区域 操作背包
                handleBackpackClick();
            }
            return;
        }

        if (uistate.chest_isOpening) {
            handleChestClick(selecting);
            if (getChestSelectedIndex() !== -1) {
                return; // 命中了箱子槽位，已处理
            }
            // 未命中箱子槽位，尝试处理背包
            handleChestBackpackClick();
            return;
        }

        if (!uistate.inventory_isOpening) {return;}

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
        if (uistate.craftingTable_isOpening) {
            handleWorkbenchContextMenu();
            if (selectedWbType === null) {
                handleBackpackContextMenu();
            }
            return;
        }

        if (uistate.chest_isOpening) {
            handleChestContextMenu(selecting);
            if (getChestSelectedIndex() !== -1) {
                return;
            }
            handleChestBackpackContextMenu();
            return;
        }

        if (!uistate.inventory_isOpening) {return;}

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

//在背包或物品栏中绘制物品的函数
//更新单个槽位的显示（根据 Slots 对象）
function updateSlotDisplay(sprite: PIXI.Sprite, text: PIXI.Text, slot: Slots): void {
    if (!slot || slot.item === -1) {
        sprite.visible = false;
        text.visible = false;
        return;
    }
    //获取物品纹理（块或物品）
    let tex: PIXI.Texture | null = null;
    if (slot.item < 512) { //方块
        tex = blockTextures[slot.item] || null;
    } else { //物品
        tex = itemTextures[slot.item] || null;
    }
    if (tex) {
        sprite.texture = tex;
        sprite.visible = true;
    } else {
        sprite.visible = false;
    }

    //数量文本
    if (slot.num > 1) {
        text.text = String(slot.num);
        text.visible = true;
    } else {
        text.visible = false;
    }
}

//更新所有背包槽位（36个）
function updateAllSlots(): void {
    for (let i = 0; i < inventory.items.length; i++) {
        updateSlotDisplay(slotSprites[i], slotTexts[i], inventory.items[i]);
    }
}

function updateWidgetSlots(): void {
    for (let i = 0; i < 9; i++) {
        updateSlotDisplay(widgetSlotSprites[i], widgetSlotTexts[i], inventory.items[i]);
    }
}

//更新合成网格（4个）和输出
function updateCraftingSlots(): void {
    for (let i = 0; i < craftingSlots.length; i++) {
        updateSlotDisplay(craftingSlotSprites[i], craftingSlotTexts[i], craftingSlots[i]);
    }
    updateSlotDisplay(craftingResultSprite, craftingResultText, craftingResultSlot);
}

//更新拖拽物品（跟随鼠标）
function updateSelectingItem(): void {
    if (selecting.item === -1) {
        selectingSprite.visible = false;
        selectingText.visible = false;
        return;
    }
    //设置纹理（同 updateSlotDisplay）
    const sprX: number = mouse.x - selectingSprite.width / 2;
    const sprY: number = mouse.y - selectingSprite.height / 2;
    let tex = null;
    if (selecting.item < 512) {tex = blockTextures[selecting.item] || null;}
    else {tex = itemTextures[selecting.item] || null;}
    if (tex) {
        selectingSprite.texture = tex;
        selectingSprite.visible = true;
        selectingSprite.position.set(sprX, sprY);
    } else {
        selectingSprite.visible = false;
    }
    if (selecting.num > 1) {
        selectingText.text = String(selecting.num);
        selectingText.visible = true;
        selectingText.position.set(sprX + 52, sprY + 52);
    } else {
        selectingText.visible = false;
    }
}

function locateHighWhite(obj_IC: InventoryConfig, inven_X: number, inven_Y: number, graphics: PIXI.Graphics): void {
    highWhite.screenX = inven_X + obj_IC.startX;
    highWhite.screenY = inven_Y + obj_IC.startY;

    if (mouse.x >= highWhite.screenX && mouse.x <= highWhite.screenX + (obj_IC.slotWidth + obj_IC.paddingX) * obj_IC.cols &&
        mouse.y >= highWhite.screenY && mouse.y <= highWhite.screenY + (obj_IC.slotHeight + obj_IC.paddingY) * obj_IC.rows) {

        const col: number = Math.floor((mouse.x - highWhite.screenX) / (obj_IC.slotWidth + obj_IC.paddingX));
        const row: number = Math.floor((mouse.y - highWhite.screenY) / (obj_IC.slotHeight + obj_IC.paddingY));

        highWhite.x = highWhite.screenX + col * (obj_IC.slotWidth + obj_IC.paddingX);
        highWhite.y = highWhite.screenY + row * (obj_IC.slotHeight + obj_IC.paddingY);

        //绘制高亮矩形（Pixi Graphics）
        graphics.beginFill(0xffffff, 0.3);
        graphics.drawRect(highWhite.x, highWhite.y, obj_IC.slotWidth, obj_IC.slotHeight);
        graphics.endFill();
        graphics.visible = true;

        if (obj_IC.rows === 3 && obj_IC.cols === 9) {
            selectedIndex = 9 + row * obj_IC.cols + col;
        } else if (obj_IC.rows === 1 && obj_IC.cols === 9) {
            selectedIndex = row * obj_IC.cols + col;
        }
    }
}

function locateHighWhiteForCrafting(obj_IC: InventoryConfig, invenX: number, invenY: number, slotsArray: Slots[], type: "crafting" | "result", graphics: PIXI.Graphics): void {
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
            graphics.beginFill(0xffffff, 0.3);
            graphics.drawRect(startX + col * slotW, startY + row * slotH, obj_IC.slotWidth, obj_IC.slotHeight);
            graphics.endFill();
        }
    }
}

let selectedCraftingType: 'crafting' | 'result' | null = null;
let selectedCraftingIndex: number = -1;  // 对于输出槽始终为0

function drawInventory(): void {
    //确保 GUI 图片已加载完成，否则不绘制
    if (!gui_isDrawing) {return;}
    //确保 UI 元素已初始化（只执行一次）
    if (!inventoryBg) {initInventoryUI();}

    widgetSelectHighlight.position.set(widgets.x - 4 + widgets.select * 80, widgets.y - 4); //更新选中高亮位置（根据 widgets.select）
    updateWidgetSlots();

    if (!uistate.inventory_isOpening) {
        inventoryContainer.visible = false;
        return;
    }

    // 重置所有高亮状态
    selectedCraftingType = null;
    selectedCraftingIndex = -1;
    selectedIndex = -1;

    //设置容器可见性
    inventoryContainer.visible = uistate.inventory_isOpening;
    inventoryBg.visible = true; //显示背景和固定元素
    updateAllSlots(); //更新所有槽位
    updateCraftingSlots(); //更新合成区域
    bookSprite.visible = true; //配方书按钮
    playerPreviewContainer.visible = true; //玩家预览
    highlightGraphics.visible = true; //高亮
    updateSelectingItem(); //拖拽物品

    //绘制高亮
    //清空旧高亮并使其可见
    highlightGraphics.clear();
    highlightGraphics.visible = true;
    //检测普通背包格子
    locateHighWhite(invenConfig, invenX, invenY, highlightGraphics); //背包主体
    locateHighWhite(iC_hand, invenX, invenY, highlightGraphics); //背包内的热键栏
    locateHighWhite(iC_clothe, invenX, invenY, highlightGraphics);
    locateHighWhite(iC_otherHand, invenX, invenY, highlightGraphics);
    //检测合成区域
    locateHighWhiteForCrafting(iC_make, invenX, invenY, craftingSlots, 'crafting', highlightGraphics);
    locateHighWhiteForCrafting(iC_get, invenX, invenY, [craftingResultSlot], 'result', highlightGraphics);
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

function inventoryMain(): void {
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
}
inventoryMain();

function inventoryLoop(): void {
    if(player.hp > 0) {
        heartsAct();
        drawHeart();
        floatContainer.visible = uistate.invenUI_isOpening();
        drawInventory();
        draw_craftingTable();
        draw_chest();
    }
}

//供工作台调用的背包绘制函数
export function drawBackpackItems(invenX: number, invenY: number): void {
    // 初始化工作台背包显示元素（只执行一次）
    if (!wbInitialized) {
        for (let i = 0; i < inventory.items.length; i++) {
            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = 48;
            sprite.height = 48;
            sprite.visible = false;
            craftingTableContainer.addChild(sprite);
            wbSlotSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.visible = false;
            craftingTableContainer.addChild(text);
            wbSlotTexts.push(text);
        }
        wbInitialized = true;
    }

    // 更新热键栏（9个）
    for (let i = 0; i < 9; i++) {
        const x = invenX + iC_hand.startX + i * (iC_hand.slotWidth + iC_hand.paddingX) + 8;
        const y = invenY + iC_hand.startY + 8;
        updateSlotDisplay(wbSlotSprites[i], wbSlotTexts[i], inventory.items[i]);
        wbSlotSprites[i].position.set(x, y);
        wbSlotTexts[i].position.set(x + item_width + 4, y + item_height + 4);
    }

    // 更新背包主体（27个，索引 9~35）
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const idx = 9 + row * 9 + col;
            const x = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX) + 8;
            const y = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY) + 8;
            updateSlotDisplay(wbSlotSprites[idx], wbSlotTexts[idx], inventory.items[idx]);
            wbSlotSprites[idx].position.set(x, y);
            wbSlotTexts[idx].position.set(x + item_width + 4, y + item_height + 4);
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

export function setSelectedIndex(newVal: number): void {
    selectedIndex = newVal;
}

export { inventoryLoop, pickupObj, locateHighWhite, updateSelectingItem, inventory, widgets, gui_isDrawing, selecting, selectedIndex };
export { heartContainer, craftingTableContainer, deathContainer };
