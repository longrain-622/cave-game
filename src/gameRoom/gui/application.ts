import { room } from "../../constants/generic.js";
import { gameRoom } from "../rendering/rendering.js";
import { initTouchButtons } from "./gameGUI/mobileTouch.js";
import { ensureAssetsInit } from '../../constants/pixiAssets.js';
import * as PIXI from 'pixi.js';

export const guiApp = new PIXI.Application({
    width: room.width,
    height: room.height,
    antialias: false,
    backgroundAlpha: 0,
});
const viewStyle = (guiApp.view as HTMLCanvasElement).style;
viewStyle.position = 'absolute';
viewStyle.left = '0';
viewStyle.top = '0';
viewStyle.width = room.width + 'px';
viewStyle.height = room.height + 'px';
viewStyle.zIndex = '10';
viewStyle.touchAction = 'none'; //禁止浏览器默认触摸行为
viewStyle.pointerEvents = 'auto'; //确保指针事件开启
guiApp.stage.sortableChildren = true;

//按钮图像
export const buttonTextures = {
    fullTexture: null as PIXI.Texture | null,
    normal: null as PIXI.Texture | null,
    hover: null as PIXI.Texture | null,

    async init() {
        this.fullTexture = await PIXI.Assets.load('/assets/images/games/gui/widgets.png');
        if (this.fullTexture) {
            this.normal = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 66, 200, 20));
            this.hover = new PIXI.Texture(this.fullTexture.baseTexture, new PIXI.Rectangle(0, 86, 200, 20));
        } else {
            this.normal = null;
            this.hover = null;
        }
        return this;
    }
};

// 顶层 await：资源就绪后才算加载完本模块，导入方（gameContent 等）顶层即可直接使用贴图
await ensureAssetsInit();
await PIXI.Assets.load('/assets/fonts/unifont.ttf');
initTouchButtons(guiApp);
await buttonTextures.init();
if (gameRoom) {gameRoom.appendChild(guiApp.view as HTMLCanvasElement);}
else {console.log('GUI application init failure.');}
