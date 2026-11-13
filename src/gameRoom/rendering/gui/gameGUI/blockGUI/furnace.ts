import { Slots, furnaceConfig_fuel, furnaceConfig_input, furnaceConfig_output, invenConfig, iC_hand } from '../../../../gui/gameGUI/inventoryConfig.js';
import { guiTextures, gui_isDrawing } from '../../application.js';
import { inventory } from '../../../../gui/gameGUI/inventory.js';
import { updateSelectingItem } from '../inventory.js';
import { guiContainer } from '../../application.js';
import { room } from '../../../../../constants/generic.js';
import { genericTextStyle, blockTextures } from '../../../rendering.js';
import { itemTextures } from '../../../items/itemTextures.js';
import { mouse } from '../../../../input/mouseInput.js';
import { uistate } from '../../../../gui/uiState.js';
import { Furnace, clearCurrentFurnace, getCurrentFurnace, setFurnaceSelectedIndex, setFurnaceBackpackSelectedIndex, furnaceSlotNumber } from '../../../../gui/gameGUI/blockGUI/furnace.js';
import { getFurnaceRecipe, FurnaceRecipe } from '../../../../gui/gameGUI/blockGUI/furnaceRecipe.js';
import { hitTestSingleSlot, hitTestBackpack, blockGuiOrigin } from '../../../../gui/gameGUI/gameGuiState.js';
import * as PIXI from 'pixi.js';

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
    backpackSprites: PIXI.Sprite[];
    backpackCounts: PIXI.Text[];
    initFurnacePixi: () => void; // 初始化 GUI 的函数，仅执行一次
}

const furnaceGui: FurnacePixi = {
    width: 704, height: 664,
    draw_x: 0, draw_y: 0,

    furnaceContainer: new PIXI.Container(),
    blackBg: new PIXI.Graphics(),
    furnaceTex: new PIXI.BaseTexture(), // 在 initFurnacePixi 中赋值（此时 guiTextures 已可用）
    furnacePage: new PIXI.Sprite(),

    inputSprite: new PIXI.Sprite(), inputCount: new PIXI.Text(),
    outputSprite: new PIXI.Sprite(), outputCount: new PIXI.Text(),
    fuelSprite: new PIXI.Sprite(), fuelCount: new PIXI.Text(),

    fuelProgress: [], outputProgress: [],

    highlightGraphics: new PIXI.Graphics(),
    backpackSprites: [],
    backpackCounts: [],

    initFurnacePixi() {
        furnaceGui_inited = true;

        if (!this.furnaceContainer.parent) {
            guiContainer.addChild(this.furnaceContainer);
        }
        this.furnaceContainer.removeChildren();
        this.furnaceContainer.zIndex = 9;

        this.furnaceTex = guiTextures.furnace.baseTexture; // 纹理已随 gui_isDrawing 就绪

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
                const x: number = invenX + invenConfig.startX + col * (invenConfig.slotWidth + invenConfig.paddingX) + 8;
                const y: number = invenY + invenConfig.startY + row * (invenConfig.slotHeight + invenConfig.paddingY) + 8;
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
    const currentFurnace: Furnace | null = getCurrentFurnace();
    if (!currentFurnace) {return;}
    updateSlotDisplay(furnaceGui.inputSprite, furnaceGui.inputCount, currentFurnace.input);
    updateSlotDisplay(furnaceGui.outputSprite, furnaceGui.outputCount, currentFurnace.output);
    updateSlotDisplay(furnaceGui.fuelSprite, furnaceGui.fuelCount, currentFurnace.fuel);
}

function drawFurnaceHighlights(): void {
    furnaceGui.highlightGraphics.clear();
    furnaceGui.highlightGraphics.visible = false;
    setFurnaceSelectedIndex(-1);
    if (!getCurrentFurnace()) {return;}

    const slotConfigs: { cfg: typeof furnaceConfig_input; index: number }[] = [
        { cfg: furnaceConfig_input, index: furnaceSlotNumber.input },
        { cfg: furnaceConfig_output, index: furnaceSlotNumber.output },
        { cfg: furnaceConfig_fuel, index: furnaceSlotNumber.fuel },
    ];

    for (const { cfg, index } of slotConfigs) {
        const hit = hitTestSingleSlot(mouse.x, mouse.y, cfg, furnaceGui.draw_x, furnaceGui.draw_y);
        if (hit) {
            setFurnaceSelectedIndex(index);
            furnaceGui.highlightGraphics.beginFill(0xffffff, 0.3);
            furnaceGui.highlightGraphics.drawRect(hit.x, hit.y, cfg.slotWidth, cfg.slotHeight);
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
    setFurnaceBackpackSelectedIndex(-1);
    const origin = blockGuiOrigin();

    const hit = hitTestBackpack(mouse.x, mouse.y, origin.x, origin.y);
    if (hit && hit.index < inventory.items.length) {
        setFurnaceBackpackSelectedIndex(hit.index);
        furnaceGui.highlightGraphics.beginFill(0xffffff, 0.3);
        furnaceGui.highlightGraphics.drawRect(hit.x, hit.y, invenConfig.slotWidth, invenConfig.slotHeight);
        furnaceGui.highlightGraphics.endFill();
        furnaceGui.highlightGraphics.visible = true;
    }
}

// 绘制燃料与输出的进度指示
function drawProgress(): void {
    const currentFurnace: Furnace | null = getCurrentFurnace();
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
        const recipe: FurnaceRecipe | undefined = getFurnaceRecipe(currentFurnace.input.item);
        if (recipe) {
            outputFrame = Math.floor(currentFurnace.outputProgress / recipe.time * furnaceGui.outputProgress.length);
            if (outputFrame >= furnaceGui.outputProgress.length) {outputFrame = furnaceGui.outputProgress.length - 1;}
        }
    }
    for (let k = 0; k < furnaceGui.outputProgress.length; k++) {
        furnaceGui.outputProgress[k].visible = (k === outputFrame);
    }
}

export function drawFurnace(): void {
    if (!gui_isDrawing) {return;}
    if (!furnaceGui_inited) {furnaceGui.initFurnacePixi();}
    if (!uistate.furnace_isOpening) {
        furnaceGui.furnaceContainer.visible = false;
        clearCurrentFurnace();
        return;
    }

    furnaceGui.furnaceContainer.visible = uistate.furnace_isOpening;
    updateFurnaceSlots();
    drawProgress();

    // 绘制背包物品和高亮 叠加在同一个 highlightGraphics 上
    updateBackpackSlots();
    // 先清空高亮再重新绘制熔炉和背包高亮，避免重叠
    furnaceGui.highlightGraphics.clear();
    furnaceGui.highlightGraphics.visible = false;
    drawFurnaceHighlights(); // 熔炉高亮
    drawBackpackHighlights(); // 背包高亮
    updateSelectingItem(); // 更新鼠标拖拽物品的显示
}

export { handleFurnaceClick, handleFurnaceContextMenu, getFurnaceSelectedIndex, getFurnaceBackpackSelectedIndex, handleFurnaceBackpackClick, handleFurnaceBackpackContextMenu, breakFurnace } from '../../../../gui/gameGUI/blockGUI/furnace.js';
