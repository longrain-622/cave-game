import { img_gui, gui_isDrawing, Slots, chestConfig, invenConfig, iC_hand } from '../inventoryConfig.js';
import { handleBackpackClick, handleBackpackContextMenu, setSelectedIndex } from '../gameGuiState.js';
import { inventory, updateSelectingItem, guiContainer } from '../inventory.js';
import { genericTextStyle, blockTextures } from '../../../rendering.js';
import { itemTextures } from '../../../dropped/items.js';
import { getRandomInt, world } from '../../../const.js';
import { room } from '../../../../constants/generic.js';
import { mouse } from '../../../mouse.js';
import { uistate } from '../../uiState.js';
import { idOfBlock } from '../../../nature/blockMecha/blockMechanism.js';
import { createDrop } from '../../../dropped/droppedItem.js';
import { coverWhenSave, readingWorld } from '../../../gameState.js';
import * as PIXI from 'pixi.js';
import { apioxEvent, ApioxMouseEvent } from '../../../../apiox/event.js';

export interface Chest { //记录每个箱子的信息
    world_x: number; world_y: number;
    fold: Slots[]; //所装物品
}
export let chests: Chest[] = [];
let currentChest: Chest | null = null;

//初始化（读档）箱子数组
function loadChest(): void {
    if (coverWhenSave && readingWorld !== null) {
        for (let i = 0; i < readingWorld.chests.length; i++) {
            const readChest = readingWorld.chests[i];

            let fold: Slots[] = [];
            for (let k = 0; k < readChest.fold.length; k++) {
                const readChestSlot = readChest.fold[k];
                const putChestSlot = new Slots(readChestSlot.item, readChestSlot.num, readChestSlot.durability);
                fold.push(putChestSlot);
            }

            const putChest: Chest = {
                world_x: readChest.world_x,
                world_y: readChest.world_y,
                fold: fold,
            }

            chests.push(putChest);
        }
    }
}

function lookChest(look_x: number, look_y: number): Chest {
    let existing = chests.find(c => c.world_x === look_x && c.world_y === look_y);
    if (!existing) {
        existing = {
            world_x: look_x,
            world_y: look_y,
            fold: Array.from({ length: 27 }, () => new Slots(-1, 0)) // 27个空槽
        };
        chests.push(existing);
    }
    return existing;
}

function setCurrentChest(wx: number, wy: number): void {
    currentChest = lookChest(wx, wy);
}

// 打开箱子
apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
    if(ev.button !== 2) {return;}
    if(world[mouse.world_y][mouse.world_x] === idOfBlock.chest) {
        if(uistate.anyui_isOpening_except(uistate.chest_isOpening)) {return;}
        if(!uistate.chest_isOpening) {
            setCurrentChest(mouse.world_x, mouse.world_y);
            uistate.chest_isOpening = true;
        }
    }
});

// 箱子 Gui 的 Pixi 元素
let chestGui_inited: boolean = false;
const chestGui: {
    width: number; height: number; //屏幕上绘制的宽高
    draw_x: number; draw_y: number; //绘制的坐标
    chestContainer: PIXI.Container;
    blackBg: PIXI.Graphics;
    chestTex: PIXI.BaseTexture;
    chestPage: PIXI.Sprite;
    slotSprites: PIXI.Sprite[];
    slotTexts: PIXI.Text[];
    highlightGraphics: PIXI.Graphics;
    selectedIndex: number;
    backpackSprites: PIXI.Sprite[];
    backpackTexts: PIXI.Text[];
    backpackSelectedIndex: number; //记录背包高亮索引
    initChestPixi: () => void;
} = {
    width: 704, height: 664,
    draw_x: 0, draw_y: 0,
    chestContainer: new PIXI.Container(),
    blackBg: new PIXI.Graphics(),
    chestTex: PIXI.Texture.from(img_gui.chest).baseTexture,
    chestPage: new PIXI.Sprite(),
    slotSprites: [] as PIXI.Sprite[],
    slotTexts: [] as PIXI.Text[],
    highlightGraphics: new PIXI.Graphics(),
    selectedIndex: -1,
    backpackSprites: [],
    backpackTexts: [],
    backpackSelectedIndex: -1,

    initChestPixi(): void {
        chestGui_inited = true;

        if (!this.chestContainer.parent) {
            guiContainer.addChild(this.chestContainer);
        }
        this.chestContainer.removeChildren();
        this.chestContainer.zIndex = 9;

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
    if (!currentChest) return;
    const slots = currentChest.fold;
    for (let i = 0; i < slots.length; i++) {
        updateSlotDisplay(chestGui.slotSprites[i], chestGui.slotTexts[i], slots[i]);
    }
}

function drawChestHighlights(): void {
    chestGui.highlightGraphics.clear();
    chestGui.highlightGraphics.visible = false;
    chestGui.selectedIndex = -1;
    if (!currentChest) return;

    const { cols, rows, slotWidth, slotHeight, startX, startY, paddingX, paddingY } = chestConfig;
    const baseX = chestGui.draw_x + startX;
    const baseY = chestGui.draw_y + startY;
    const stepX = slotWidth + paddingX;
    const stepY = slotHeight + paddingY;

    if (mouse.x >= baseX && mouse.x <= baseX + cols * stepX &&
        mouse.y >= baseY && mouse.y <= baseY + rows * stepY) {
        const col = Math.floor((mouse.x - baseX) / stepX);
        const row = Math.floor((mouse.y - baseY) / stepY);
        const idx = row * cols + col;
        if (idx < currentChest.fold.length) {
            chestGui.selectedIndex = idx;
            chestGui.highlightGraphics.beginFill(0xffffff, 0.3);
            chestGui.highlightGraphics.drawRect(
                baseX + col * stepX,
                baseY + row * stepY,
                slotWidth, slotHeight
            );
            chestGui.highlightGraphics.endFill();
            chestGui.highlightGraphics.visible = true;
        }
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
    chestGui.backpackSelectedIndex = -1;
    const invenX = (room.width - 704) / 2;
    const invenY = (room.height - 664) / 2;

    // 检测热键栏（9格）
    const hand = iC_hand;
    const handStartX = invenX + hand.startX;
    const handStartY = invenY + hand.startY;
    const handW = hand.slotWidth + hand.paddingX;
    const handH = hand.slotHeight + hand.paddingY;
    if (mouse.x >= handStartX && mouse.x <= handStartX + handW * hand.cols &&
        mouse.y >= handStartY && mouse.y <= handStartY + handH * hand.rows) {
        const col = Math.floor((mouse.x - handStartX) / handW);
        const row = Math.floor((mouse.y - handStartY) / handH);
        const idx = row * hand.cols + col;
        if (idx < 9) {
            chestGui.backpackSelectedIndex = idx;
            chestGui.highlightGraphics.beginFill(0xffffff, 0.3);
            chestGui.highlightGraphics.drawRect(handStartX + col * handW, handStartY + row * handH, hand.slotWidth, hand.slotHeight);
            chestGui.highlightGraphics.endFill();
            chestGui.highlightGraphics.visible = true;
            return;
        }
    }

    // 检测背包主体（27格）
    const inven = invenConfig;
    const invenStartX = invenX + inven.startX;
    const invenStartY = invenY + inven.startY;
    const invenW = inven.slotWidth + inven.paddingX;
    const invenH = inven.slotHeight + inven.paddingY;
    if (mouse.x >= invenStartX && mouse.x <= invenStartX + invenW * inven.cols &&
        mouse.y >= invenStartY && mouse.y <= invenStartY + invenH * inven.rows) {
        const col = Math.floor((mouse.x - invenStartX) / invenW);
        const row = Math.floor((mouse.y - invenStartY) / invenH);
        const idx = 9 + row * inven.cols + col;
        if (idx < inventory.items.length) {
            chestGui.backpackSelectedIndex = idx;
            chestGui.highlightGraphics.beginFill(0xffffff, 0.3);
            chestGui.highlightGraphics.drawRect(invenStartX + col * invenW, invenStartY + row * invenH, inven.slotWidth, inven.slotHeight);
            chestGui.highlightGraphics.endFill();
            chestGui.highlightGraphics.visible = true;
        }
    }
}

export function draw_chest(): void {
    if (!gui_isDrawing) {return;}
    if (!chestGui_inited) {chestGui.initChestPixi();}
    if (!uistate.chest_isOpening) {
        chestGui.chestContainer.visible = false;
        currentChest = null;
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

// 交互处理函数
export function handleChestClick(selecting: Slots): void {
    if (chestGui.selectedIndex === -1 || !currentChest) {return;}
    const target = currentChest.fold[chestGui.selectedIndex];
    const mouseHas = (selecting.item !== -1);
    const targetHas = (target.item !== -1);

    if (!mouseHas && targetHas) {
        selecting.item = target.item;
        selecting.num = target.num;
        target.item = -1;
        target.num = 0;
        return;
    }
    if (mouseHas && !targetHas) {
        target.item = selecting.item;
        target.num = selecting.num;
        selecting.item = -1;
        selecting.num = 0;
        return;
    }
    if (mouseHas && targetHas) {
        if (selecting.item === target.item && (selecting.num + target.num <= target.max)) {
            target.num += selecting.num;
            selecting.item = -1;
            selecting.num = 0;
        } else {
            const tmpItem = target.item, tmpNum = target.num;
            target.item = selecting.item;
            target.num = selecting.num;
            selecting.item = tmpItem;
            selecting.num = tmpNum;
        }
    }
}

export function handleChestContextMenu(selecting: Slots): void {
    if (chestGui.selectedIndex === -1 || !currentChest) {return;}
    const target = currentChest.fold[chestGui.selectedIndex];
    const mouseHas = (selecting.item !== -1);
    const targetHas = (target.item !== -1);

    if (!mouseHas && targetHas) {
        selecting.item = target.item;
        selecting.num = 1;
        target.num -= 1;
        if (target.num === 0) {target.item = -1;}
        return;
    }
    if (mouseHas) {
        if (!targetHas) {
            target.item = selecting.item;
            target.num = 1;
            selecting.num -= 1;
            if (selecting.num === 0) { selecting.item = -1; selecting.num = 0; }
        } else if (target.item === selecting.item && target.num < target.max) {
            target.num += 1;
            selecting.num -= 1;
            if (selecting.num === 0) { selecting.item = -1; selecting.num = 0; }
        }
    }
}

//导出背包索引与交互函数（供 inventory 使用）
export function getChestSelectedIndex(): number {
    return chestGui.selectedIndex;
}

export function getBackpackSelectedIndex(): number {
    return chestGui.backpackSelectedIndex;
}

//将背包点击委托给 inventory.ts 中的函数，但传入当前高亮索引
export function handleChestBackpackClick(): void {
    if (chestGui.backpackSelectedIndex !== -1) {
        setSelectedIndex(chestGui.backpackSelectedIndex);
        handleBackpackClick();
    }
}

export function handleChestBackpackContextMenu(): void {
    if (chestGui.backpackSelectedIndex !== -1) {
        setSelectedIndex(chestGui.backpackSelectedIndex);
        handleBackpackContextMenu();
    }
}

//箱子被破坏时的处理
export function breakChest(chest_world_x: number, chest_world_y: number): void {
    if(world[chest_world_y][chest_world_x] === idOfBlock.chest && chests.length > 0) {
        //破坏箱子后关闭 GUI 状态
        if (uistate.chest_isOpening) {
            uistate.chest_isOpening = false;
            currentChest = null;
        }

        const target = chests.find(obj => (obj.world_x === chest_world_x && obj.world_y === chest_world_y));
        if (!target) {return;}
        chests.splice(chests.indexOf(target), 1);

        for (let i = 0; i < target.fold.length; i++) {
            if(target.fold[i].item === -1) {continue;}
            for(let k = 0; k < target.fold[i].num; k++) {
                createDrop(target.fold[i].item, chest_world_x * 64 + getRandomInt(0, 64), chest_world_y * 64 + getRandomInt(0, 64));
            }
        }
    }
}

function chestMain(): void {
    loadChest();
}
chestMain();