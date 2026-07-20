import { img_gui, gui_isDrawing } from './inventoryConfig.js';
import { guiApp } from '../application.js';
import { room } from '../../const.js';
import { uistate } from '../uiState.js';
import * as PIXI from 'pixi.js';

//箱子 Gui 的 Pixi 元素
let chestGui_inited: boolean = false;
const chestGui: {
    width: number; height: number; //屏幕上绘制的宽高
    draw_x: number; draw_y: number; //绘制的坐标
    chestContainer: PIXI.Container;
    blackBg: PIXI.Graphics;
    chestTex: PIXI.BaseTexture;
    chestPage: PIXI.Sprite;
    initChestPixi: Function;
} = {
    width: 704, height: 664,
    draw_x: 0, draw_y: 0,
    chestContainer: new PIXI.Container(),
    blackBg: new PIXI.Graphics(),
    chestTex: PIXI.Texture.from(img_gui.chest).baseTexture,
    chestPage: new PIXI.Sprite(),

    initChestPixi(): void {
        chestGui_inited = true;

        if(!this.chestContainer.parent) {
            guiApp.stage.addChild(this.chestContainer);
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
    },
};

export function draw_chest(): void {
    if(!gui_isDrawing) {return;}
    if(!chestGui_inited) {chestGui.initChestPixi();}
    if(!uistate.chest_isOpening) {
        chestGui.chestContainer.visible = false;
        return;
    }

    chestGui.chestContainer.visible = uistate.chest_isOpening;
}