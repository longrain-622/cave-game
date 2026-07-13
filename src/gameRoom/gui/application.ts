import { room } from "../const.js";
import { gameRoom } from "../rendering.js";
import * as PIXI from 'pixi.js';

export const guiApp = new PIXI.Application({
    width: room.width,
    height: room.height,
    transparent: true,
    antialias: false,
    backgroundAlpha: 0,
});
guiApp.view.style.position = 'absolute';
guiApp.view.style.left = '0';
guiApp.view.style.top = '0';
guiApp.view.style.width = room.width + 'px';
guiApp.view.style.height = room.height + 'px';
guiApp.view.style.zIndex = '10';

await PIXI.Assets.init({ basePath: './assets/' });
await PIXI.Assets.load('/assets/fonts/unifont.ttf');

//按钮图像
export const buttonTextures = {
    fullTexture: null as PIXI.Texture | null,
    normal: null as PIXI.Texture | null,
    hover: null as PIXI.Texture | null,
    
    async init() {
        this.fullTexture = await PIXI.Assets.load('/assets/images/games/gui/widgets.png');
        this.normal = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 66, 200, 20));
        this.hover = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 86, 200, 20));
        return this;
    }
};
await buttonTextures.init();

gameRoom.appendChild(guiApp.view as HTMLCanvasElement);