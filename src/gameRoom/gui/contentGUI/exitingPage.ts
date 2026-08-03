// exitingPage.ts
import * as PIXI from 'pixi.js';
import { guiApp } from '../application.js';
import { textStyle1 } from '../../../constants/pixiStyles.js';
import { blockTextures } from '../../rendering.js';
import { idOfBlock } from '../../nature/blockMecha/blockMechanism.js';
import { room } from '../../../constants/generic.js';
import { apioxHttp } from '../../../apiox/http.js';
import { lang } from '../../../others/i18n.js';

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

        this.background = new PIXI.TilingSprite(blockTextures[idOfBlock.dirt], room.width, room.height);
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

function exitPageMain(): void {
    exitPagePixi.init();
}
exitPageMain();

export { exitPagePixi };