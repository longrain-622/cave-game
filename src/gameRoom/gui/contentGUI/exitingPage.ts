// exitingPage.ts
import * as PIXI from 'pixi.js';
import { guiApp } from '../application.js';
import { textStyle1 } from '../../../constants/pixiStyles.js';
import { blockTextures } from '../../rendering.js';
import { idOfBlock } from '../../nature/blockMecha/blocks.js';
import { room } from '../../../constants/generic.js';
import { apioxHttp } from '../../../apiox/http.js';
import { lang } from '../../../others/i18n.js';
import { eventBus } from '../../others/eventBus.js';

interface ExitPagePixi {
    container: PIXI.Container;
    background: PIXI.TilingSprite;
    blackBg: PIXI.Graphics;
    text_saving: PIXI.Text;
    inited: boolean;
    init: () => void;
}

// 退出游戏时显示正在退出中的页面
const exitPagePixi: ExitPagePixi = {
    container: new PIXI.Container(),
    background: new PIXI.TilingSprite(PIXI.Texture.EMPTY),
    blackBg: new PIXI.Graphics(),
    text_saving: new PIXI.Text(),
    inited: false,

    async init() {
        if (this.inited) {return;}
        this.inited = true;
        
        if (!this.container.parent) {
            guiApp.stage.addChild(this.container);
        }
        this.container.removeChildren();
        this.container.visible = false;
        this.container.zIndex = 11;

        // 等待泥土纹理初始化完成后再创建背景，
        // 防止模块加载阶段纹理未就绪时以空纹理创建 TilingSprite 导致渲染失败
        const dirtTexture: PIXI.Texture = await waitForDirtTexture();

        this.background = new PIXI.TilingSprite(dirtTexture, room.width, room.height);
        this.background.tileScale.x = 4;
        this.background.tileScale.y = 4;
        this.background.anchor.set(0, 0);
        this.background.position.set(0, 0);
        this.container.addChild(this.background);

        this.blackBg = new PIXI.Graphics();
        this.blackBg.beginFill(0x000000, 0.6);
        this.blackBg.drawRect(0, 0, room.width, room.height);
        this.container.addChild(this.blackBg);

        this.text_saving = new PIXI.Text('', textStyle1());
        this.text_saving.text = await loadSavingText();
        this.text_saving.style.fontSize = 20;
        this.text_saving.anchor.set(0.5, 0.5);
        this.text_saving.position.set(room.width / 2, room.height / 2);
        this.container.addChild(this.text_saving);

        loadSavingText();
    }
};

// 获取"保存世界中"文字（异步加载本地化文本，语言由 i18n 的 lang 决定）
async function loadSavingText(): Promise<string> {
    try {
        const data = await apioxHttp.get<{ exitingPage: { savingText: string } }>(`/assets/locales/${lang}/game.json`);
        return data.exitingPage.savingText;
    } catch (error) {
        console.error('load saving text error', error);
        return '';
    }
}

// 等待泥土纹理初始化完成（blockTextures 在渲染模块全部贴图加载完毕后才会填充）
// 纹理未就绪时等待 textures:ready 事件，而非轮询时间
function waitForDirtTexture(): Promise<PIXI.Texture> {
    const readyTexture: PIXI.Texture = blockTextures[idOfBlock.dirt];
    if (readyTexture) {return Promise.resolve(readyTexture);}

    return new Promise((resolve) => {
        eventBus.once('textures:ready', () => resolve(blockTextures[idOfBlock.dirt]));
    });
}

function exitPageMain(): void {
    exitPagePixi.init();
}
exitPageMain();

export { exitPagePixi };