import { Slots, chestConfig, invenConfig, iC_hand } from '../../../../gui/gameGUI/inventoryConfig.js';
import { guiTextures, gui_isDrawing } from '../../application.js';
import { inventory } from '../../../../gui/gameGUI/inventory.js';
import { updateSelectingItem } from '../inventory.js';
import { guiContainer } from '../../application.js';
import { genericTextStyle, blockTextures } from '../../../rendering.js';
import { itemTextures } from '../../../items/itemTextures.js';
import { room } from '../../../../../constants/generic.js';
import { mouse } from '../../../../input/mouseInput.js';
import { uistate } from '../../../../gui/uiState.js';
import { Chest, clearCurrentChest, getCurrentChest, setChestSelectedIndex, setChestBackpackSelectedIndex } from '../../../../gui/gameGUI/blockGUI/chest.js';
import { hitTestSlot, hitTestBackpack, blockGuiOrigin } from '../../../../gui/gameGUI/gameGuiState.js';
import * as PIXI from 'pixi.js';

// 箱子 Gui 的 Pixi 元素
let chestGui_inited: boolean = false;
const chestGui: {
    width: number; height: number; // 屏幕上绘制的宽高
    draw_x: number; draw_y: number; // 绘制的坐标
    chestContainer: PIXI.Container;
    blackBg: PIXI.Graphics;
    chestTex: PIXI.BaseTexture | null;
    chestPage: PIXI.Sprite;
    slotSprites: PIXI.Sprite[];
    slotTexts: PIXI.Text[];
    highlightGraphics: PIXI.Graphics;
    backpackSprites: PIXI.Sprite[];
    backpackTexts: PIXI.Text[];
    initChestPixi: () => void;
} = {
    width: 704, height: 664,
    draw_x: 0, draw_y: 0,
    chestContainer: new PIXI.Container(),
    blackBg: new PIXI.Graphics(),
    chestTex: null, // 在 initChestPixi 中赋值（此时 guiTextures 已可用）
    chestPage: new PIXI.Sprite(),
    slotSprites: [] as PIXI.Sprite[],
    slotTexts: [] as PIXI.Text[],
    highlightGraphics: new PIXI.Graphics(),
    backpackSprites: [],
    backpackTexts: [],

    initChestPixi(): void {
        chestGui_inited = true;

        if (!this.chestContainer.parent) {
            guiContainer.addChild(this.chestContainer);
        }
        this.chestContainer.removeChildren();
        this.chestContainer.zIndex = 9;

        this.chestTex = guiTextures.chest.baseTexture; // 纹理已随 gui_isDrawing 就绪

        this.draw_x = room.width / 2 - this.width / 2;
        this.draw_y = room.height / 2 - this.height / 2;

        this.blackBg = new PIXI.Graphics();
        this.blackBg.beginFill(0x000000, 0.5);
        this.blackBg.drawRect(0, 0, room.width, room.height);
        this.blackBg.visible = true;
        this.chestContainer.addChild(this.blackBg);

        const chestPageTex: PIXI.Texture = new PIXI.Texture(this.chestTex, new PIXI.Rectangle(0, 0, 176, 166));
        this.chestPage = new PIXI.Sprite(chestPageTex);
        this.chestPage.width = this.width;
        this.chestPage.height = this.height;
        this.chestPage.position.set(this.draw_x, this.draw_y);
        this.chestPage.visible = true;
        this.chestContainer.addChild(this.chestPage);

        //创建 27 个槽位（9×3）
        const { cols, rows, slotWidth, slotHeight, startX, startY, paddingX, paddingY } = chestConfig;
        for (let i = 0; i < cols * rows; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = this.draw_x + startX + col * (slotWidth + paddingX) + 8;
            const y = this.draw_y + startY + row * (slotHeight + paddingY) + 8;

            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = 48;
            sprite.height = 48;
            sprite.position.set(x, y);
            sprite.visible = false;
            this.chestContainer.addChild(sprite);
            this.slotSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.position.set(x + 52, y + 52);
            text.visible = false;
            this.chestContainer.addChild(text);
            this.slotTexts.push(text);
        }

        // 创建背包物品（36格，与 inventory.ts 中位置完全一致）
        const invenX = (room.width - inventory.width) / 2;
        const invenY = (room.height - inventory.height) / 2;
        const width = 48, height = 48;

        // 热键栏（9格）
        for (let i = 0; i < iC_hand.cols; i++) {
            const x = invenX + iC_hand.startX + i * (iC_hand.slotWidth + iC_hand.paddingX) + 8;
            const y = invenY + iC_hand.startY + 8;
            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = width; sprite.height = height;
            sprite.position.set(x, y);
            sprite.visible = false;
            this.chestContainer.addChild(sprite);
            this.backpackSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.position.set(x + width + 4, y + height + 4);
            text.visible = false;
            this.chestContainer.addChild(text);
            this.backpackTexts.push(text);
        }

        // 背包主体（27格）
        for (let row = 0; row < invenConfig.rows; row++) {
            for (let col = 0; col < invenConfig.cols; col++) {
                const x = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX) + 8;
                const y = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY) + 8;
                const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
                sprite.width = width; sprite.height = height;
                sprite.position.set(x, y);
                sprite.visible = false;
                this.chestContainer.addChild(sprite);
                this.backpackSprites.push(sprite);

                const text = new PIXI.Text('', genericTextStyle());
                text.style.fontSize = 28;
                text.anchor.set(1, 1);
                text.position.set(x + width + 4, y + height + 4);
                text.visible = false;
                this.chestContainer.addChild(text);
                this.backpackTexts.push(text);
            }
        }

        //高亮图形
        this.highlightGraphics = new PIXI.Graphics();
        this.highlightGraphics.visible = false;
        this.chestContainer.addChild(this.highlightGraphics);
    },
};

//辅助更新函数
function updateSlotDisplay(sprite: PIXI.Sprite, text: PIXI.Text, slot: Slots): void {
    if (!slot || slot.item === -1) {
        sprite.visible = false;
        text.visible = false;
        return;
    }
    let tex = (slot.item < 512) ? blockTextures[slot.item] : itemTextures[slot.item];
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

function updateChestSlots(): void {
    const currentChest: Chest | null = getCurrentChest();
    if (!currentChest) return;
    const slots = currentChest.fold;
    for (let i = 0; i < slots.length; i++) {
        updateSlotDisplay(chestGui.slotSprites[i], chestGui.slotTexts[i], slots[i]);
    }
}

function drawChestHighlights(): void {
    chestGui.highlightGraphics.clear();
    chestGui.highlightGraphics.visible = false;
    setChestSelectedIndex(-1);
    const currentChest: Chest | null = getCurrentChest();
    if (!currentChest) return;

    const hit = hitTestSlot(mouse.x, mouse.y, chestConfig, chestGui.draw_x, chestGui.draw_y);
    if (hit && hit.index < currentChest.fold.length) {
        setChestSelectedIndex(hit.index);
        chestGui.highlightGraphics.beginFill(0xffffff, 0.3);
        chestGui.highlightGraphics.drawRect(hit.x, hit.y, chestConfig.slotWidth, chestConfig.slotHeight);
        chestGui.highlightGraphics.endFill();
        chestGui.highlightGraphics.visible = true;
    }
}

function updateBackpackSlots(): void {
    const invenItems = inventory.items;
    for (let i = 0; i < invenItems.length; i++) {
        const slot = invenItems[i];
        const sprite = chestGui.backpackSprites[i];
        const text = chestGui.backpackTexts[i];
        if (!slot || slot.item === -1) {
            sprite.visible = false;
            text.visible = false;
            continue;
        }
        let tex = (slot.item < 512) ? blockTextures[slot.item] : itemTextures[slot.item];
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
}

function drawBackpackHighlights(): void {
    setChestBackpackSelectedIndex(-1);
    const origin = blockGuiOrigin();

    const hit = hitTestBackpack(mouse.x, mouse.y, origin.x, origin.y);
    if (hit && hit.index < inventory.items.length) {
        setChestBackpackSelectedIndex(hit.index);
        chestGui.highlightGraphics.beginFill(0xffffff, 0.3);
        chestGui.highlightGraphics.drawRect(hit.x, hit.y, invenConfig.slotWidth, invenConfig.slotHeight);
        chestGui.highlightGraphics.endFill();
        chestGui.highlightGraphics.visible = true;
    }
}

export function drawChest(): void {
    if (!gui_isDrawing) {return;}
    if (!chestGui_inited) {chestGui.initChestPixi();}
    if (!uistate.chest_isOpening) {
        chestGui.chestContainer.visible = false;
        clearCurrentChest();
        return;
    }

    chestGui.chestContainer.visible = uistate.chest_isOpening;
    updateChestSlots();
    drawChestHighlights();

    // 绘制背包物品和高亮 叠加在同一个 highlightGraphics 上
    updateBackpackSlots();
    // 先清空高亮再重新绘制箱子和背包高亮，避免重叠
    chestGui.highlightGraphics.clear();
    chestGui.highlightGraphics.visible = false;
    drawChestHighlights(); // 箱子高亮
    drawBackpackHighlights(); // 背包高亮
    updateSelectingItem(); // 更新鼠标拖拽物品的显示
}
export { handleChestClick, handleChestContextMenu, getChestSelectedIndex, getBackpackSelectedIndex, handleChestBackpackClick, handleChestBackpackContextMenu, breakChest } from '../../../../gui/gameGUI/blockGUI/chest.js';
