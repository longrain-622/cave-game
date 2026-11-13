import { ct_crafting, ct_get, Slots, invenConfig, iC_hand } from "../../../../gui/gameGUI/inventoryConfig.js";
import { guiTextures } from "../../application.js";
import { locateHighWhite } from "../inventory.js";
import { updateSelectingItem } from "../inventory.js";
import { inventory } from "../../../../gui/gameGUI/inventory.js";
import { craftingTableContainer } from "../../application.js";
import { mouse } from "../../../../input/mouseInput.js";
import { room } from "../../../../../constants/generic.js";
import { blockTextures, genericTextStyle } from "../../../rendering.js";
import { itemTextures } from "../../../items/itemTextures.js";
import { uistate } from "../../../../gui/uiState.js";
import { workbenchSlots, workbenchResultSlot, setWorkbenchSelection } from "../../../../gui/gameGUI/blockGUI/crafting_table.js";
import { hitTestSlot, hitTestSingleSlot } from "../../../../gui/gameGUI/gameGuiState.js";
import * as PIXI from 'pixi.js';

// 工作台界面尺寸
const craftingTable: {width: number; height: number;} = {
    width: 704, height: 664
}

//Pixi UI 元素
let wbBg: PIXI.Sprite; //工作台背景图
let wbOverlay: PIXI.Graphics; //半透明黑色遮罩
let wbSlotSprites: PIXI.Sprite[] = []; //9个合成格子图标
let wbSlotTexts: PIXI.Text[] = []; //9个合成格子数量
let wbResultSprite: PIXI.Sprite; //输出槽图标
let wbResultText: PIXI.Text; //输出槽数量
let wbHighlight: PIXI.Graphics; //高亮矩形
let wbInitialized = false;
// 工作台中显示的背包槽位（36格，独立于工作台合成网格的 wbSlotSprites/wbSlotTexts）
let wbBagSprites: PIXI.Sprite[] = [];
let wbBagTexts: PIXI.Text[] = [];
let wbBagInitialized = false;
const item_width: number = 48, item_height: number = 48; //绘制的物品长宽

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

    const craftingTableAllTex: PIXI.BaseTexture = guiTextures.crafting_table.baseTexture;
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
    setWorkbenchSelection(null, -1);
    wbHighlight.clear();
    wbHighlight.visible = false;

    //合成网格 (3x3)
    const gridHit = hitTestSlot(mouse.x, mouse.y, ct_crafting, invenX, invenY);
    if (gridHit && gridHit.index < workbenchSlots.length) {
        setWorkbenchSelection('crafting', gridHit.index);
        wbHighlight.beginFill(0xffffff, 0.3);
        wbHighlight.drawRect(gridHit.x, gridHit.y, ct_crafting.slotWidth, ct_crafting.slotHeight);
        wbHighlight.endFill();
        wbHighlight.visible = true;
    }

    //输出槽
    const outHit = hitTestSingleSlot(mouse.x, mouse.y, ct_get, invenX, invenY);
    if (outHit) {
        setWorkbenchSelection('result', 0);
        wbHighlight.beginFill(0xffffff, 0.3);
        wbHighlight.drawRect(outHit.x, outHit.y, ct_get.slotWidth, ct_get.slotHeight);
        wbHighlight.endFill();
        wbHighlight.visible = true;
    }
}

function drawWorkbench(): void {
    if (!uistate.craftingTable_isOpening) {
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

function drawBackpackItems(invenX: number, invenY: number): void {
    // 初始化工作台背包显示元素（只执行一次）
    if (!wbBagInitialized) {
        for (let i = 0; i < inventory.items.length; i++) {
            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = 48;
            sprite.height = 48;
            sprite.visible = false;
            craftingTableContainer.addChild(sprite);
            wbBagSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.visible = false;
            craftingTableContainer.addChild(text);
            wbBagTexts.push(text);
        }
        wbBagInitialized = true;
    }

    craftingTableContainer.setChildIndex(wbHighlight, craftingTableContainer.children.length - 1);

    // 更新热键栏（9个）
    for (let i = 0; i < 9; i++) {
        const x = invenX + iC_hand.startX + i * (iC_hand.slotWidth + iC_hand.paddingX) + 8;
        const y = invenY + iC_hand.startY + 8;
        updateSlotDisplay(wbBagSprites[i], wbBagTexts[i], inventory.items[i]);
        wbBagSprites[i].position.set(x, y);
        wbBagTexts[i].position.set(x + item_width + 4, y + item_height + 4);
    }

    // 更新背包主体（27个，索引 9~35）
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const idx = 9 + row * 9 + col;
            const x = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX) + 8;
            const y = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY) + 8;
            updateSlotDisplay(wbBagSprites[idx], wbBagTexts[idx], inventory.items[idx]);
            wbBagSprites[idx].position.set(x, y);
            wbBagTexts[idx].position.set(x + item_width + 4, y + item_height + 4);
        }
    }
}

export { drawWorkbench, craftingTable };

