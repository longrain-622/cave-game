import { Slots, img_gui, furnaceConfig_fuel, furnaceConfig_input, furnaceConfig_output, invenConfig, iC_hand, gui_isDrawing, InventoryConfig } from '../inventoryConfig.js';
import { handleBackpackClick, handleBackpackContextMenu, setSelectedIndex } from '../gameGuiState.js';
import { guiContainer, inventory, updateSelectingItem } from '../inventory.js';
import { room } from '../../../../constants/generic.js';
import { genericTextStyle, blockTextures } from '../../../rendering.js';
import { itemTextures } from '../../../dropped/items.js';
import { getRandomInt, point_coll_rect, world } from '../../../const.js';
import { readingWorld, coverWhenSave } from '../../../gameState.js';
import { WorldArchive, FurnaceArchive } from '../../../../types/worldArchive.js';
import { mouse } from '../../../mouse.js';
import { player } from '../../../player.js';
import { uistate } from '../../uiState.js';
import { idOfBlock } from '../../../nature/blockMecha/blocks.js';
import { createDrop } from '../../../dropped/droppedItem.js';
import { notNullUndefined } from '../../../../constants/utils.js';
import * as PIXI from 'pixi.js';
import { apioxEvent, ApioxMouseEvent } from '../../../../apiox/event.js';
import { getFurnaceRecipe, FurnaceRecipe, fuels } from './furnaceRecipe.js';

export interface Furnace {
    world_x: number; world_y: number;
    fuel: Slots;
    input: Slots;
    output: Slots;
    fuelProgress: number; // 燃料燃烧的进度
    outputProgress: number;
}
export const furnaceArray: Furnace[] = [];
let currentFurnace: Furnace | null = null;
const lookRange: number = 32 * 64; // 最大渲染距离，超过此值的实例，循环自动跳过，单位：px

// 加载存档中的所有熔炉
function loadFurnace(readWorld: WorldArchive): void {
    if (!(coverWhenSave && notNullUndefined(readWorld))) {return;}
    if (!notNullUndefined(readWorld.furnaces)) {
        console.log('cannot load the furnaces of your world!');
        return;
    }

    for (let f = 0; f < readWorld.furnaces.length; f++) {
        const readFurnace: FurnaceArchive = readWorld.furnaces[f];
        const input = new Slots(readFurnace.input.item, readFurnace.input.num, readFurnace.input.durability);
        const output = new Slots(readFurnace.output.item, readFurnace.output.num, readFurnace.output.durability);
        const fuel = new Slots(readFurnace.fuel.item, readFurnace.fuel.num, readFurnace.fuel.durability);

        const addFurnace: Furnace = {
            world_x: readFurnace.world_x, world_y: readFurnace.world_y,
            fuel: fuel,
            input: input,
            output: output,
            fuelProgress: readFurnace.fuelProgress,
            outputProgress: readFurnace.outputProgress,
        };

        furnaceArray.push(addFurnace);
    }
}

function lookFurnace(look_x: number, look_y: number): Furnace {
    // 清除无用的熔炉对象
    for (let i = furnaceArray.length - 1; i >= 0; i--) {
        const fur: Furnace = furnaceArray[i];
        if (!world[fur.world_y] || world[fur.world_y][fur.world_x] !== idOfBlock.furnace) {
            furnaceArray.splice(i, 1);
        }
    }

    // 查找或补漏某个位置的熔炉对象
    let existing = furnaceArray.find(f => f.world_x === look_x && f.world_y === look_y);
    if (!existing) {
        existing = {
            world_x: look_x,
            world_y: look_y,
            input: new Slots(-1, 0),
            output: new Slots(-1, 0),
            fuel: new Slots(-1, 0),
            fuelProgress: 0,
            outputProgress: 0,
        };
        furnaceArray.push(existing);
    }
    return existing;
}

function setCurrentFurnace(wx: number, wy: number): void {
    currentFurnace = lookFurnace(wx, wy);
}

// 打开熔炉
apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {
    if (ev.button !== 2) {return;}
    if (world[mouse.world_y][mouse.world_x] === idOfBlock.furnace) {
        if (uistate.anyui_isOpening_except(uistate.furnace_isOpening)) {return;}
        if (!uistate.furnace_isOpening) {
            setCurrentFurnace(mouse.world_x, mouse.world_y);
            uistate.furnace_isOpening = true;
        }
    }
});

let furnaceGui_inited: boolean = false;
interface FurnacePixi {
    width: number; height: number; // 屏幕上绘制的宽高
    draw_x: number; draw_y: number; // 绘制的坐标
    furnaceContainer: PIXI.Container;
    blackBg: PIXI.Graphics;
    furnaceTex: PIXI.BaseTexture;
    furnacePage: PIXI.Sprite;
    inputSprite: PIXI.Sprite; inputCount: PIXI.Text;
    outputSprite: PIXI.Sprite; outputCount: PIXI.Text;
    fuelSprite: PIXI.Sprite; fuelCount: PIXI.Text;
    fuelProgress: PIXI.Sprite[]; outputProgress: PIXI.Sprite[];
    highlightGraphics: PIXI.Graphics;
    selectedIndex: number;
    backpackSprites: PIXI.Sprite[];
    backpackCounts: PIXI.Text[];
    backpackSelectedIndex: number; // 记录背包高亮索引
    initFurnacePixi: () => void; // 初始化 GUI 的函数，仅执行一次
}

enum furnaceSlotNumber {
    input, output, fuel
}

const furnaceGui: FurnacePixi = {
    width: 704, height: 664,
    draw_x: 0, draw_y: 0,

    furnaceContainer: new PIXI.Container(),
    blackBg: new PIXI.Graphics(),
    furnaceTex: PIXI.Texture.from(img_gui.furnace).baseTexture,
    furnacePage: new PIXI.Sprite(),

    inputSprite: new PIXI.Sprite(), inputCount: new PIXI.Text(),
    outputSprite: new PIXI.Sprite(), outputCount: new PIXI.Text(),
    fuelSprite: new PIXI.Sprite(), fuelCount: new PIXI.Text(),

    fuelProgress: [], outputProgress: [],

    highlightGraphics: new PIXI.Graphics(),
    selectedIndex: -1,
    backpackSprites: [],
    backpackCounts: [],
    backpackSelectedIndex: -1,

    initFurnacePixi() {
        furnaceGui_inited = true;

        if (!this.furnaceContainer.parent) {
            guiContainer.addChild(this.furnaceContainer);
        }
        this.furnaceContainer.removeChildren();
        this.furnaceContainer.zIndex = 9;

        this.draw_x = room.width / 2 - this.width / 2;
        this.draw_y = room.height / 2 - this.height / 2;

        // 黑色半透明背景
        this.blackBg = new PIXI.Graphics();
        this.blackBg.beginFill(0x000000, 0.5);
        this.blackBg.drawRect(0, 0, room.width, room.height);
        this.blackBg.visible = true;
        this.furnaceContainer.addChild(this.blackBg);

        // 熔炉 GUI 贴图
        const furnacePageTex: PIXI.Texture = new PIXI.Texture(this.furnaceTex, new PIXI.Rectangle(0, 0, 176, 166));
        this.furnacePage = new PIXI.Sprite(furnacePageTex);
        this.furnacePage.width = this.width;
        this.furnacePage.height = this.height;
        this.furnacePage.position.set(this.draw_x, this.draw_y);
        this.furnacePage.visible = true;
        this.furnaceContainer.addChild(this.furnacePage);

        const width: number = 48;
        const height: number = 48;

        // 创建输入槽位
        {
            const x = this.draw_x + furnaceConfig_input.startX + 8;
            const y = this.draw_y + furnaceConfig_input.startY + 8;
            this.inputSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            this.inputSprite.width = width;
            this.inputSprite.height = height;
            this.inputSprite.position.set(x, y);
            this.inputSprite.visible = false;
            this.furnaceContainer.addChild(this.inputSprite);

            this.inputCount = new PIXI.Text('', genericTextStyle());
            this.inputCount.style.fontSize = 28;
            this.inputCount.anchor.set(1, 1);
            this.inputCount.position.set(x + width + 4, y + height + 4);
            this.inputCount.visible = false;
            this.furnaceContainer.addChild(this.inputCount);
        }

        // 创建输出槽位
        {
            const x = this.draw_x + furnaceConfig_output.startX + 24;
            const y = this.draw_y + furnaceConfig_output.startY + 24;
            this.outputSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            this.outputSprite.width = width;
            this.outputSprite.height = height;
            this.outputSprite.position.set(x, y);
            this.outputSprite.visible = false;
            this.furnaceContainer.addChild(this.outputSprite);

            this.outputCount = new PIXI.Text('', genericTextStyle());
            this.outputCount.style.fontSize = 28;
            this.outputCount.anchor.set(1, 1);
            this.outputCount.position.set(x + width + 4, y + height + 4);
            this.outputCount.visible = false;
            this.furnaceContainer.addChild(this.outputCount);
        }

        // 创建燃料槽位
        {
            const x = this.draw_x + furnaceConfig_fuel.startX + 8;
            const y = this.draw_y + furnaceConfig_fuel.startY + 8;
            this.fuelSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            this.fuelSprite.width = width;
            this.fuelSprite.height = height;
            this.fuelSprite.position.set(x, y);
            this.fuelSprite.visible = false;
            this.furnaceContainer.addChild(this.fuelSprite);

            this.fuelCount = new PIXI.Text('', genericTextStyle());
            this.fuelCount.style.fontSize = 28;
            this.fuelCount.anchor.set(1, 1);
            this.fuelCount.position.set(x + width + 4, y + height + 4);
            this.fuelCount.visible = false;
            this.furnaceContainer.addChild(this.fuelCount);
        }

        // 燃料燃烧的进度（火焰从底部向上生长，共 14 帧）
        // 页面上的火焰轮廓位于贴图坐标 (57,37)~(69,49)，贴图 4 倍缩放
        for (let i = 0; i < 14; i++) {
            // 取火焰贴图 (177,0,14,14) 的底部 i+1 行，火焰基座始终对齐轮廓底部
            const fuelProgressTex = new PIXI.Texture(this.furnaceTex, new PIXI.Rectangle(177, 13 - i, 14, i + 1));
            const fuelProgress = new PIXI.Sprite(fuelProgressTex);
            fuelProgress.width = 56;
            fuelProgress.height = (i + 1) * 4;
            fuelProgress.position.set(this.draw_x + 228, this.draw_y + 200 - (i + 1) * 4);
            fuelProgress.visible = false;
            this.fuelProgress.push(fuelProgress);
        }

        // 输出获取的进度（白色箭头从左向右填充，共 24 帧）
        // 页面上的灰色空箭头位于贴图坐标 (80,34)~(100,49)
        for (let k = 0; k < 24; k++) {
            // 露出部分随帧数变长
            const outputProgressTex = new PIXI.Texture(this.furnaceTex, new PIXI.Rectangle(177, 14, k + 1, 16));
            const outputProgress = new PIXI.Sprite(outputProgressTex);
            outputProgress.width = (k + 1) * 4;
            outputProgress.height = 64;
            outputProgress.position.set(this.draw_x + 320, this.draw_y + 136);
            outputProgress.visible = false;
            this.outputProgress.push(outputProgress);
        }

        // 把所有进度精灵添加进数组
        for (let c = 0; c < 14; c++) {
            this.furnaceContainer.addChild(this.fuelProgress[c]);
        }

        for (let c = 0; c < 24; c++) {
            this.furnaceContainer.addChild(this.outputProgress[c]);
        }

        // 创建背包物品
        const invenX: number = (room.width - inventory.width) / 2;
        const invenY: number = (room.height - inventory.height) / 2;

        // 热键栏（9格）
        for (let i = 0; i < iC_hand.cols; i++) {
            const x: number = invenX + iC_hand.startX + i * (iC_hand.slotWidth + iC_hand.paddingX) + 8;
            const y: number = invenY + iC_hand.startY + 8;
            const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            sprite.width = width; sprite.height = height;
            sprite.position.set(x, y);
            sprite.visible = false;
            this.furnaceContainer.addChild(sprite);
            this.backpackSprites.push(sprite);

            const text = new PIXI.Text('', genericTextStyle());
            text.style.fontSize = 28;
            text.anchor.set(1, 1);
            text.position.set(x + width + 4, y + height + 4);
            text.visible = false;
            this.furnaceContainer.addChild(text);
            this.backpackCounts.push(text);
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
                this.furnaceContainer.addChild(sprite);
                this.backpackSprites.push(sprite);

                const text = new PIXI.Text('', genericTextStyle());
                text.style.fontSize = 28;
                text.anchor.set(1, 1);
                text.position.set(x + width + 4, y + height + 4);
                text.visible = false;
                this.furnaceContainer.addChild(text);
                this.backpackCounts.push(text);
            }
        }

        //高亮图形
        this.highlightGraphics = new PIXI.Graphics();
        this.highlightGraphics.visible = false;
        this.furnaceContainer.addChild(this.highlightGraphics);
    }
};

// 辅助更新函数
function updateSlotDisplay(sprite: PIXI.Sprite, text: PIXI.Text, slot: Slots): void {
    if (!slot || slot.item === -1) {
        sprite.visible = false;
        text.visible = false;
        return;
    }
    const tex = (slot.item < 512) ? blockTextures[slot.item] : itemTextures[slot.item];
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

function updateFurnaceSlots(): void {
    if (!currentFurnace) {return;}
    updateSlotDisplay(furnaceGui.inputSprite, furnaceGui.inputCount, currentFurnace.input);
    updateSlotDisplay(furnaceGui.outputSprite, furnaceGui.outputCount, currentFurnace.output);
    updateSlotDisplay(furnaceGui.fuelSprite, furnaceGui.fuelCount, currentFurnace.fuel);
}

function drawFurnaceHighlights(): void {
    furnaceGui.highlightGraphics.clear();
    furnaceGui.highlightGraphics.visible = false;
    furnaceGui.selectedIndex = -1;
    if (!currentFurnace) {return;}

    const slotConfigs: { cfg: typeof furnaceConfig_input; sprite: PIXI.Sprite; index: number }[] = [
        { cfg: furnaceConfig_input, sprite: furnaceGui.inputSprite, index: furnaceSlotNumber.input },
        { cfg: furnaceConfig_output, sprite: furnaceGui.outputSprite, index: furnaceSlotNumber.output },
        { cfg: furnaceConfig_fuel, sprite: furnaceGui.fuelSprite, index: furnaceSlotNumber.fuel },
    ];

    for (const { cfg, index } of slotConfigs) {
        const sx: number = furnaceGui.draw_x + cfg.startX;
        const sy: number = furnaceGui.draw_y + cfg.startY;
        const sw: number = cfg.slotWidth;
        const sh: number = cfg.slotHeight;

        if (mouse.x >= sx && mouse.x <= sx + sw &&
            mouse.y >= sy && mouse.y <= sy + sh) {
            furnaceGui.selectedIndex = index;
            furnaceGui.highlightGraphics.beginFill(0xffffff, 0.3);
            furnaceGui.highlightGraphics.drawRect(sx, sy, sw, sh);
            furnaceGui.highlightGraphics.endFill();
            furnaceGui.highlightGraphics.visible = true;
            return;
        }
    }
}

function updateBackpackSlots(): void {
    const invenItems = inventory.items;
    for (let i = 0; i < invenItems.length; i++) {
        const slot: Slots = invenItems[i];
        const sprite: PIXI.Sprite = furnaceGui.backpackSprites[i];
        const text: PIXI.Text = furnaceGui.backpackCounts[i];
        if (!slot || slot.item === -1) {
            sprite.visible = false;
            text.visible = false;
            continue;
        }
        const tex = (slot.item < 512) ? blockTextures[slot.item] : itemTextures[slot.item];
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
    furnaceGui.backpackSelectedIndex = -1;
    const invenX: number = (room.width - 704) / 2;
    const invenY: number = (room.height - 664) / 2;

    // 检测热键栏（9格）
    const hand: InventoryConfig = iC_hand;
    const handStartX: number = invenX + hand.startX;
    const handStartY: number = invenY + hand.startY;
    const handW: number = hand.slotWidth + hand.paddingX;
    const handH: number = hand.slotHeight + hand.paddingY;
    if (mouse.x >= handStartX && mouse.x <= handStartX + handW * hand.cols &&
        mouse.y >= handStartY && mouse.y <= handStartY + handH * hand.rows) {
        const col: number = Math.floor((mouse.x - handStartX) / handW);
        const row: number = Math.floor((mouse.y - handStartY) / handH);
        const idx: number = row * hand.cols + col;
        if (idx < 9) {
            furnaceGui.backpackSelectedIndex = idx;
            furnaceGui.highlightGraphics.beginFill(0xffffff, 0.3);
            furnaceGui.highlightGraphics.drawRect(handStartX + col * handW, handStartY + row * handH, hand.slotWidth, hand.slotHeight);
            furnaceGui.highlightGraphics.endFill();
            furnaceGui.highlightGraphics.visible = true;
            return;
        }
    }

    // 检测背包主体（27格）
    const inven: InventoryConfig = invenConfig;
    const invenStartX: number = invenX + inven.startX;
    const invenStartY: number = invenY + inven.startY;
    const invenW: number = inven.slotWidth + inven.paddingX;
    const invenH: number = inven.slotHeight + inven.paddingY;
    if (mouse.x >= invenStartX && mouse.x <= invenStartX + invenW * inven.cols &&
        mouse.y >= invenStartY && mouse.y <= invenStartY + invenH * inven.rows) {
        const col: number = Math.floor((mouse.x - invenStartX) / invenW);
        const row: number = Math.floor((mouse.y - invenStartY) / invenH);
        const idx: number = 9 + row * inven.cols + col;
        if (idx < inventory.items.length) {
            furnaceGui.backpackSelectedIndex = idx;
            furnaceGui.highlightGraphics.beginFill(0xffffff, 0.3);
            furnaceGui.highlightGraphics.drawRect(invenStartX + col * invenW, invenStartY + row * invenH, inven.slotWidth, inven.slotHeight);
            furnaceGui.highlightGraphics.endFill();
            furnaceGui.highlightGraphics.visible = true;
        }
    }
}

// 绘制燃料与输出的进度指示
function drawProgress(): void {
    if (!currentFurnace) {return;}

    // 燃料火焰：燃烧中按燃料进度显示对应高度的火焰帧，否则全部隐藏
    // 100 与 firingItem 中一份燃料燃烧的进度上限一致
    let fuelFrame: number = Math.floor(currentFurnace.fuelProgress / 512 * furnaceGui.fuelProgress.length);
    if (fuelFrame >= furnaceGui.fuelProgress.length) {fuelFrame = furnaceGui.fuelProgress.length - 1;}
    for (let i = 0; i < furnaceGui.fuelProgress.length; i++) {
        furnaceGui.fuelProgress[i].visible = (currentFurnace.fuelProgress > 0 && i === fuelFrame);
    }

    // 输出箭头：烧制中按烧制进度显示对应长度的箭头帧，否则全部隐藏
    let outputFrame: number = -1;
    if (currentFurnace.outputProgress > 0) {
        const recipe: FurnaceRecipe = getFurnaceRecipe(currentFurnace.input.item);
        if (recipe) {
            outputFrame = Math.floor(currentFurnace.outputProgress / recipe.time * furnaceGui.outputProgress.length);
            if (outputFrame >= furnaceGui.outputProgress.length) {outputFrame = furnaceGui.outputProgress.length - 1;}
        }
    }
    for (let k = 0; k < furnaceGui.outputProgress.length; k++) {
        furnaceGui.outputProgress[k].visible = (k === outputFrame);
    }
}

export function draw_furnace(): void {
    if (!gui_isDrawing) {return;}
    if (!furnaceGui_inited) {furnaceGui.initFurnacePixi();}
    if (!uistate.furnace_isOpening) {
        furnaceGui.furnaceContainer.visible = false;
        currentFurnace = null;
        return;
    }

    furnaceGui.furnaceContainer.visible = uistate.furnace_isOpening;
    updateFurnaceSlots();
    drawProgress();
    drawFurnaceHighlights();

    // 绘制背包物品和高亮 叠加在同一个 highlightGraphics 上
    updateBackpackSlots();
    // 先清空高亮再重新绘制熔炉和背包高亮，避免重叠
    furnaceGui.highlightGraphics.clear();
    furnaceGui.highlightGraphics.visible = false;
    drawFurnaceHighlights(); // 熔炉高亮
    drawBackpackHighlights(); // 背包高亮
    updateSelectingItem(); // 更新鼠标拖拽物品的显示
}

// 交互处理函数
export function handleFurnaceClick(selecting: Slots): void {
    if (furnaceGui.selectedIndex === -1 || !currentFurnace) {return;}
    let target: Slots;
    switch (furnaceGui.selectedIndex) {
        case furnaceSlotNumber.input: target = currentFurnace.input; break;
        case furnaceSlotNumber.output: target = currentFurnace.output; break;
        case furnaceSlotNumber.fuel: target = currentFurnace.fuel; break;
        default: return;
    }

    // 输出槽只能拿物品，不能放
    if (furnaceGui.selectedIndex === furnaceSlotNumber.output) {
        if (selecting.item === -1 && target.item !== -1) {
            selecting.item = target.item;
            selecting.num = target.num;
            target.item = -1;
            target.num = 0;
        }
        return;
    }

    const mouseHas: boolean = (selecting.item !== -1);
    const targetHas: boolean = (target.item !== -1);

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

    // 玩家改变了输入槽的物品，重置烧制进度，避免进度被新物品继承
    if (furnaceGui.selectedIndex === furnaceSlotNumber.input) {
        currentFurnace.outputProgress = 0;
    }
}

export function handleFurnaceContextMenu(selecting: Slots): void {
    if (furnaceGui.selectedIndex === -1 || !currentFurnace) {return;}
    let target: Slots;
    switch (furnaceGui.selectedIndex) {
        case furnaceSlotNumber.input: target = currentFurnace.input; break;
        case furnaceSlotNumber.output: target = currentFurnace.output; break;
        case furnaceSlotNumber.fuel: target = currentFurnace.fuel; break;
        default: return;
    }

    // 输出槽只能拿物品，不能放
    if (furnaceGui.selectedIndex === furnaceSlotNumber.output) {
        if (selecting.item === -1 && target.item !== -1) {
            selecting.item = target.item;
            selecting.num = 1;
            target.num -= 1;
            if (target.num === 0) {target.item = -1;}
        }
        return;
    }

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

    // 玩家改变了输入槽的物品，重置烧制进度，避免进度被新物品继承
    if (furnaceGui.selectedIndex === furnaceSlotNumber.input) {
        currentFurnace.outputProgress = 0;
    }
}

// 导出熔炉索引与交互函数（供 inventory 使用）
export function getFurnaceSelectedIndex(): number {
    return furnaceGui.selectedIndex;
}

export function getFurnaceBackpackSelectedIndex(): number {
    return furnaceGui.backpackSelectedIndex;
}

// 将背包点击委托给 inventory.ts 中的函数，但传入当前高亮索引
export function handleFurnaceBackpackClick(): void {
    if (furnaceGui.backpackSelectedIndex !== -1) {
        setSelectedIndex(furnaceGui.backpackSelectedIndex);
        handleBackpackClick();
    }
}

export function handleFurnaceBackpackContextMenu(): void {
    if (furnaceGui.backpackSelectedIndex !== -1) {
        setSelectedIndex(furnaceGui.backpackSelectedIndex);
        handleBackpackContextMenu();
    }
}

// 烧制物品
// 当有熔炉处于正在使用的状态时，每帧执行一次
function firingItem(whichFurnace: Furnace): void {
    // 检测输入物品对应的配方
    // 输入被拿走（空气）时同样找不到配方，走下面的分支：进度归零、火焰熄灭，不会冻结
    const recipe: FurnaceRecipe = getFurnaceRecipe(whichFurnace.input.item);
    if (!recipe) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress--;}
        return;
    }

    // 输出槽已有物品且与成品种类不同，则不进行烧制
    if (whichFurnace.output.item !== idOfBlock.air) {
        if (whichFurnace.output.item !== recipe.output) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress--;}
            return;
        }
        // 输出槽已堆叠满，无法继续放入成品
        if (whichFurnace.output.num >= whichFurnace.output.max) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress--;}
            return;
        }
    }

    // 燃料槽为空或物品不是燃料，不烧制
    if (!fuels.includes(whichFurnace.fuel.item)) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress--;}
        return;
    }

    // 递增进度
    whichFurnace.outputProgress++;
    whichFurnace.fuelProgress++;

    // 进度达到配方所需时间，输出成品
    if (whichFurnace.outputProgress >= recipe.time) {
        // 消耗一个输入物品
        whichFurnace.input.num--;
        if (whichFurnace.input.num <= 0) {
            whichFurnace.input.item = idOfBlock.air;
            whichFurnace.input.num = 0;
        }

        // 输出成品：输出槽为空则放置，否则数量递增
        if (whichFurnace.output.item === -1) {
            whichFurnace.output.item = recipe.output;
            whichFurnace.output.num = 1;
            whichFurnace.output.durability = -1;
        } else {
            whichFurnace.output.num++;
        }
        whichFurnace.outputProgress = 0;
    }

    // 消耗燃料
    if (whichFurnace.fuelProgress >= 512) {
        whichFurnace.fuelProgress = 0;
        whichFurnace.fuel.num--;

        if (whichFurnace.fuel.num <= 0) {
            whichFurnace.fuel.item = idOfBlock.air;
            whichFurnace.fuel.num = 0;
        }
    }
}

// 每帧处理所有熔炉的烧制
export function furnaceLoop(): void {
    for (let i = 0; i < furnaceArray.length; i++) {
        if (!point_coll_rect(furnaceArray[i].world_x * 64, furnaceArray[i].world_y * 64, player.x - lookRange / 2, player.y - lookRange / 2, lookRange, lookRange)) {
            continue; // 超出玩家视野范围的熔炉跳过，继续处理其余熔炉
        }
        firingItem(furnaceArray[i]);
    }
}

// 熔炉被破坏时的处理
export function breakFurnace(furnace_world_x: number, furnace_world_y: number): void {
    if (world[furnace_world_y][furnace_world_x] === idOfBlock.furnace && furnaceArray.length > 0) {
        // 破坏熔炉后关闭 GUI 状态
        if (uistate.furnace_isOpening) {
            uistate.furnace_isOpening = false;
            currentFurnace = null;
        }

        const target: Furnace = furnaceArray.find(obj => (obj.world_x === furnace_world_x && obj.world_y === furnace_world_y));
        if (!target) {return;}
        furnaceArray.splice(furnaceArray.indexOf(target), 1);

        const allSlots: Slots[] = [target.input, target.output, target.fuel];
        for (let i = 0; i < allSlots.length; i++) {
            if (allSlots[i].item === -1) {continue;}
            for (let k = 0; k < allSlots[i].num; k++) {
                createDrop(allSlots[i].item, furnace_world_x * 64 + getRandomInt(0, 64), furnace_world_y * 64 + getRandomInt(0, 64));
            }
        }
    }
}

function furnaceMain(): void {
    loadFurnace(readingWorld);
}
furnaceMain();