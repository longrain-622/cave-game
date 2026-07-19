import { ct_crafting, ct_get, Slots, invenConfig, iC_hand } from "./inventoryConfig.js";
import { img_gui, inventory, selecting, craftingTableContainer, drawBackpackItems, locateHighWhite, updateSelectingItem } from "./inventory.js";
import { updateResultForGrid, consumeFromGrid, recipes } from './crafting.js';
import { mouse } from "../../mouse.js";
import { world, room } from "../../const.js";
import { blockTextures, genericTextStyle } from "../../rendering.js";
import { itemTextures } from "../../dropped/items.js";
import { apioxEvent, ApioxMouseEvent } from "../../../apiox/event.js";
import * as PIXI from 'pixi.js';

const craftingTable: {isOpening: boolean; width: number; height: number;} = {
    isOpening: false, width: 704, height: 664
}

//工作台的合成网格（3x3）和输出槽
export const workbenchSlots: Slots[] = [];
export const workbenchResultSlot = new Slots(-1, 0);
const WORKBENCH_COLS: number = 3;
const WORKBENCH_ROWS: number = 3;

//初始化 9 个空槽位
for (let i = 0; i < WORKBENCH_COLS * WORKBENCH_ROWS; i++) {
    workbenchSlots.push(new Slots(-1, 0));
}

//工作台高亮相关
let selectedWbType: 'crafting' | 'result' | null = null;
let selectedWbIndex: number = -1;

//Pixi UI 元素
let wbBg: PIXI.Sprite; //工作台背景图
let wbOverlay: PIXI.Graphics; //半透明黑色遮罩
let wbSlotSprites: PIXI.Sprite[] = []; //9个合成格子图标
let wbSlotTexts: PIXI.Text[] = []; //9个合成格子数量
let wbResultSprite: PIXI.Sprite; //输出槽图标
let wbResultText: PIXI.Text; //输出槽数量
let wbHighlight: PIXI.Graphics; //高亮矩形
let wbInitialized = false;
const item_width: number = 48, item_height: number = 48; //绘制的物品长宽

//更新工作台合成结果
function updateWorkbenchResult() {
    updateResultForGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS);
}

function updateSlotDisplay(sprite: PIXI.Sprite, text: PIXI.Text, slot: Slots): void {
    if (!slot || slot.item === -1) {
        sprite.visible = false;
        text.visible = false;
        return;
    }
    let tex: PIXI.Texture | null = null;
    if (slot.item < 512) {tex = blockTextures[slot.item] || null;}
    else {tex = itemTextures[slot.item] || null;}
    if (tex) {
        sprite.texture = tex;
        sprite.visible = true;
    } else {
        sprite.visible = false;
    }
    if (slot.num > 1) {
        text.text = String(slot.num);
        text.visible = true;
    } else {
        text.visible = false;
    }
}

//初始化工作台 UI（只执行一次）
function initWorkbenchUI() {
    if (wbInitialized) {return;}
    craftingTableContainer.removeChildren();

    //遮罩
    wbOverlay = new PIXI.Graphics();
    wbOverlay.beginFill(0x000000, 0.5);
    wbOverlay.drawRect(0, 0, room.width, room.height);
    wbOverlay.endFill();
    craftingTableContainer.addChild(wbOverlay);

    const craftingTableAllTex: PIXI.BaseTexture = PIXI.Texture.from(img_gui.crafting_table).baseTexture;
    const craftingTableTex: PIXI.Texture = new PIXI.Texture(craftingTableAllTex, new PIXI.Rectangle(0, 0, 176, 166));

    //背景
    wbBg = new PIXI.Sprite(craftingTableTex);
    wbBg.width = craftingTable.width;
    wbBg.height = craftingTable.height;
    const invenX: number = (room.width - craftingTable.width) / 2;
    const invenY: number = (room.height - craftingTable.height) / 2;
    wbBg.position.set(invenX, invenY);
    craftingTableContainer.addChild(wbBg);

    //9个合成槽位（3x3）
    for (let i = 0; i < 9; i++) {
        const row: number = Math.floor(i / 3);
        const col: number = i % 3;
        const x: number = invenX + ct_crafting.startX + col * (ct_crafting.slotWidth + ct_crafting.paddingX) + 8;
        const y: number = invenY + ct_crafting.startY + row * (ct_crafting.slotHeight + ct_crafting.paddingY) + 8;
        const sprite: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
        sprite.width = 48;
        sprite.height = 48;
        sprite.position.set(x, y);
        sprite.visible = false;
        craftingTableContainer.addChild(sprite);
        wbSlotSprites.push(sprite);

        const text: PIXI.Text = new PIXI.Text('', genericTextStyle());
        text.style.fontSize = 28;
        text.anchor.set(1, 1);
        text.position.set(x + item_width + 4, y + item_height + 4);
        text.visible = false;
        craftingTableContainer.addChild(text);
        wbSlotTexts.push(text);
    }

    //输出槽
    const outX: number = invenX + ct_get.startX + item_width / 2;
    const outY: number = invenY + ct_get.startY + item_height / 2;
    wbResultSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    wbResultSprite.width = item_width;
    wbResultSprite.height = item_height;
    wbResultSprite.position.set(outX, outY);
    wbResultSprite.visible = false;
    craftingTableContainer.addChild(wbResultSprite);

    wbResultText = new PIXI.Text('', genericTextStyle());
    wbResultText.style.fontSize = 28;
    wbResultText.anchor.set(1, 1);
    wbResultText.position.set(outX + item_width + 4, outY + item_height + 4);
    wbResultText.visible = false;
    craftingTableContainer.addChild(wbResultText);

    //高亮图形
    wbHighlight = new PIXI.Graphics();
    wbHighlight.visible = false;
    craftingTableContainer.addChild(wbHighlight);

    wbInitialized = true;
}

//绘制工作台合成区域的高亮
function drawWorkbenchHighlights(invenX: number, invenY: number) {
    selectedWbType = null;
    selectedWbIndex = -1;
    wbHighlight.clear();
    wbHighlight.visible = false;

    //合成网格 (3x3)
    const gridStartX: number = invenX + ct_crafting.startX;
    const gridStartY: number = invenY + ct_crafting.startY;
    const slotW: number = ct_crafting.slotWidth + ct_crafting.paddingX;
    const slotH: number = ct_crafting.slotHeight + ct_crafting.paddingY;

    if (mouse.x >= gridStartX && mouse.x <= gridStartX + slotW * ct_crafting.cols &&
        mouse.y >= gridStartY && mouse.y <= gridStartY + slotH * ct_crafting.rows) {
        const col: number = Math.floor((mouse.x - gridStartX) / slotW);
        const row: number = Math.floor((mouse.y - gridStartY) / slotH);
        const idx: number = row * ct_crafting.cols + col;
        if (idx < workbenchSlots.length) {
            selectedWbType = 'crafting';
            selectedWbIndex = idx;
            wbHighlight.beginFill(0xffffff, 0.3);
            wbHighlight.drawRect(gridStartX + col * slotW, gridStartY + row * slotH,
                ct_crafting.slotWidth, ct_crafting.slotHeight);
            wbHighlight.endFill();
            wbHighlight.visible = true;
        }
    }

    //输出槽
    const outStartX: number = invenX + ct_get.startX;
    const outStartY: number = invenY + ct_get.startY;
    if (mouse.x >= outStartX && mouse.x <= outStartX + ct_get.slotWidth &&
        mouse.y >= outStartY && mouse.y <= outStartY + ct_get.slotHeight) {
        selectedWbType = 'result';
        selectedWbIndex = 0;
        wbHighlight.beginFill(0xffffff, 0.3);
        wbHighlight.drawRect(outStartX, outStartY, ct_get.slotWidth, ct_get.slotHeight);
        wbHighlight.endFill();
        wbHighlight.visible = true;
    }
}

apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
    if(ev.button !== 2 || inventory.isOpening) {return;}
    if(world[mouse.world_y][mouse.world_x] === 9 && craftingTable.isOpening === false) {
        craftingTable.isOpening = true;
    }
});

function draw_craftingTable(): void {
    if (!craftingTable.isOpening) {
        craftingTableContainer.visible = false;
        return;
    }
    craftingTableContainer.visible = true;
    initWorkbenchUI(); //确保已初始化

    const invenX: number = (room.width - craftingTable.width) / 2;
    const invenY: number = (room.height - craftingTable.height) / 2;

    //更新背景位置（如果尺寸变化，但一般不变）
    wbBg.position.set(invenX, invenY);

    //更新合成槽位
    for (let i = 0; i < workbenchSlots.length; i++) {
        updateSlotDisplay(wbSlotSprites[i], wbSlotTexts[i], workbenchSlots[i]);
        //位置已在初始化时固定
    }
    updateSlotDisplay(wbResultSprite, wbResultText, workbenchResultSlot);

    //绘制工作台高亮
    drawWorkbenchHighlights(invenX, invenY);
    locateHighWhite(invenConfig, invenX, invenY, wbHighlight);
    locateHighWhite(iC_hand, invenX, invenY, wbHighlight);

    drawBackpackItems(invenX, invenY);

    updateSelectingItem(); //绘制鼠标拖拽的物品（跟随鼠标）
}

// 导出工作台交互函数，供 inventory.ts 的全局事件调用
export function handleWorkbenchClick(): void {
    if (selectedWbType === null) {return;}

    // 重要：如果选中输出槽且鼠标上已有物品，则禁止任何操作（与背包合成行为一致）
    if (selectedWbType === 'result' && selecting.item !== -1) {
        return;
    }

    let targetSlot: Slots;
    if (selectedWbType === 'crafting') {
        targetSlot = workbenchSlots[selectedWbIndex];
    } else {
        targetSlot = workbenchResultSlot;
    }

    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 鼠标空，目标有 -> 拿起
    if (!mouseHasItem && targetHasItem) {
        if (selectedWbType === 'result') {
            const outputId = targetSlot.item;
            const recipe = recipes.find(r => r.outputId === outputId);
            if (recipe) {
                const consumed = consumeFromGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS);
                if (consumed > 0) {
                    const takenCount = recipe.outputCount * consumed;
                    // 修改 selecting 的内部属性，而不是重新赋值
                    selecting.item = outputId;
                    selecting.num = takenCount;
                }
            }
        } else {
            // 拿起普通合成槽物品
            selecting.item = targetSlot.item;
            selecting.num = targetSlot.num;
            targetSlot.item = -1;
            targetSlot.num = 0;
            updateWorkbenchResult();
        }
        return;
    }

    // 鼠标有，目标空 -> 放下
    if (mouseHasItem && !targetHasItem) {
        targetSlot.item = selecting.item;
        targetSlot.num = selecting.num;
        // 清空 selecting 内部属性
        selecting.item = -1;
        selecting.num = 0;
        updateWorkbenchResult();
        return;
    }

    // 双方都有 -> 相同且可叠加则合并，否则交换
    if (mouseHasItem && targetHasItem) {
        if (selecting.item === targetSlot.item && (selecting.num + targetSlot.num <= targetSlot.max)) {
            targetSlot.num += selecting.num;
            // 清空 selecting
            selecting.item = -1;
            selecting.num = 0;
        } else {
            // 交换：保存目标槽的属性，然后覆盖
            const tempItem = targetSlot.item;
            const tempNum = targetSlot.num;
            targetSlot.item = selecting.item;
            targetSlot.num = selecting.num;
            selecting.item = tempItem;
            selecting.num = tempNum;
        }
        updateWorkbenchResult();
        return;
    }
}

export function handleWorkbenchContextMenu(): void {
    if (selectedWbType === null) {return};

    // 如果选中输出槽且鼠标上已有物品，禁止操作
    if (selectedWbType === 'result' && selecting.item !== -1) {
        return;
    }

    let targetSlot: Slots;
    if (selectedWbType === 'crafting') {
        targetSlot = workbenchSlots[selectedWbIndex];
    } else {
        targetSlot = workbenchResultSlot;
    }

    const mouseHasItem = (selecting.item !== -1);
    const targetHasItem = (targetSlot.item !== -1);

    // 鼠标空，目标有 -> 拿起1个
    if (!mouseHasItem && targetHasItem) {
        if (selectedWbType === 'result') {
            const outputId = targetSlot.item;
            const recipe = recipes.find(r => r.outputId === outputId);
            if (recipe && targetSlot.num >= recipe.outputCount) {
                const consumed = consumeFromGrid(workbenchSlots, workbenchResultSlot, WORKBENCH_COLS, WORKBENCH_ROWS, 1);
                if (consumed === 1) {
                    selecting.item = outputId;
                    selecting.num = recipe.outputCount;
                }
            }
        } else {
            selecting.item = targetSlot.item;
            selecting.num = 1;
            targetSlot.num -= 1;
            if (targetSlot.num === 0) targetSlot.item = -1;
            updateWorkbenchResult();
        }
        return;
    }

    // 鼠标有，尝试放入1个
    if (mouseHasItem) {
        if (targetSlot.item === -1) {
            targetSlot.item = selecting.item;
            targetSlot.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
            updateWorkbenchResult();
        } else if (targetSlot.item === selecting.item && targetSlot.num < targetSlot.max) {
            targetSlot.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) {
                selecting.item = -1;
                selecting.num = 0;
            }
            updateWorkbenchResult();
        }
    }
}

export { draw_craftingTable, craftingTable, selectedWbType };