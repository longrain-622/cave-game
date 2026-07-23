import { ApioxObject, apiObjects } from '../apiox/dom.js';
import { apiMethod } from '../apiox/method.js';
import { room } from '../gameRoom/const.js';
import * as PIXI from 'pixi.js';
import "localforage";

// localforage 的 UMD 包通过 importmap 加载后只设置 window.localforage，无 default export
declare const localforage: LocalForage;

// worldwindow 相关元素
const gameDifficulty_btn = new ApioxObject(null, 'gameDifficulty-btn');
let gameDifficulty: number = 0;
let gameDifficulties: string[] = [];

const worldwindow = new ApioxObject('worldwindow');
const editWorld = new ApioxObject('editWorld');
const editWorldBtnQuit = new ApioxObject('editWorldBtnQuit');
const editWorldBtnCreate = new ApioxObject('editWorldBtnCreate');
export const wolrdCreator = new ApioxObject('wolrdCreator');
const create_btn = new ApioxObject(null, 'create-btn');
const back_btn = new ApioxObject(null, 'back-btn');

worldwindow.hide();

back_btn.on('click', (): void => { wolrdCreator.hide(); editWorld.show(); });
editWorldBtnQuit.on('click', (): void => { worldwindow.hide(); });
editWorldBtnCreate.on('click', (): void => { editWorld.hide(); wolrdCreator.show(); });

function updateDifficultyTexts(): void {
    gameDifficulties = [
        (apiObjects.win as any).t('worldCreation.gameDifficulty0'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty1'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty2'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty3')
    ];
    if (gameDifficulties[gameDifficulty] !== undefined) {
        gameDifficulty_btn.domProperty('textContent', gameDifficulties[gameDifficulty]);
    }
}
apiObjects.win.addEventListener('i18nReady', () => {
    updateDifficultyTexts();
});
if ((apiObjects.win as any).t) {
    updateDifficultyTexts();
}
gameDifficulty_btn.on('click', function() {
    gameDifficulty++;
    if (gameDifficulty > 3) { gameDifficulty = 0; }
    const newText: string = gameDifficulties[gameDifficulty];
    if (newText !== undefined) {
        gameDifficulty_btn.domProperty('textContent', newText);
    }
});

// --- PixiJS 存档列表 ---
try {
    const BLACKBG_HEIGHT = Math.floor(room.height * 0.6);

    const archiveApp = new PIXI.Application({
        width: room.width,
        height: BLACKBG_HEIGHT,
        transparent: true,
        antialias: false,
        backgroundAlpha: 0,
    });

    archiveApp.stage.sortableChildren = true;

    const blackbg = apiMethod.select('#editWorld-blackbg');
    if (blackbg) {
        const canvas = archiveApp.view as HTMLCanvasElement;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        blackbg.appendChild(canvas);
    }

    const ctr = new PIXI.Container();
    archiveApp.stage.addChild(ctr);

    const ROW_MARGIN = 20;
    const ROW_HEIGHT = 60;
    const ROW_GAP = 8;
    const TEXT_LEFT = 12;
    const NAME_Y = 6;
    const TIME_Y = 32;
    const NAME_FONT_SIZE = 24;
    const TIME_FONT_SIZE = 24;

    function renderArchiveList(entries: Array<{ key: string; name: string; lastTime: string }>): void {
        ctr.removeChildren();
        const rowWidth = archiveApp.screen.width - ROW_MARGIN * 2;
        let y = 8;

        for (const entry of entries) {
            const row = new PIXI.Container();
            row.eventMode = 'static';
            row.cursor = 'pointer';
            row.position.set(ROW_MARGIN, y);

            const bg = new PIXI.Graphics(); //未选中时不绘制任何背景
            row.addChild(bg);

            const nameText = new PIXI.Text(entry.name, {
                fontFamily: 'Unifont',
                fontSize: NAME_FONT_SIZE,
                fill: '#ffffff',
            });
            nameText.position.set(TEXT_LEFT, NAME_Y);
            row.addChild(nameText);

            const timeText = new PIXI.Text(entry.lastTime, {
                fontFamily: 'Unifont',
                fontSize: TIME_FONT_SIZE,
                fill: '#aaaaaa',
            });
            timeText.position.set(TEXT_LEFT, TIME_Y);
            row.addChild(timeText);

            (row as any)._key = entry.key;
            (row as any)._bg = bg;
            (row as any)._rowWidth = rowWidth;

            row.on('pointerdown', () => { selectArchive(entry.key, ctr); });

            ctr.addChild(row);
            y += ROW_HEIGHT + ROW_GAP;
        }
    }

    //异步初始化：加载字体 + 读取存档
    (async () => {
        try {
            await PIXI.Assets.load('/assets/fonts/unifont.ttf');
        } catch (e) {
            console.warn('editworld.ts cannot load Unifont ttf', e);
        }
        try {
            const entries = await localforage.getItem<Array<{ key: string; name: string; lastTime: string }>>('saveIndex') || [];
            renderArchiveList(entries);
        } catch (e) {
            console.warn('editworld.ts cannot read world list', e);
        }
    })();

    function selectArchive(key: string, ctr: PIXI.Container): void {
        for (const child of ctr.children) {
            const row = child as PIXI.Container;
            const bg = (row as any)._bg as PIXI.Graphics;
            const rw = (row as any)._rowWidth as number;
            const isSelected = (row as any)._key === key;

            bg.clear();
            if (isSelected) {
                //选中态：深色底色 + 厚黑边框
                bg.lineStyle(2, 0x808080, 1);
                bg.beginFill(0x000000, 0.3);
                bg.drawRect(0, 0, rw, ROW_HEIGHT);
                bg.endFill();
            }
            //未选中：不绘制任何背景
        }
    }
} catch (e) {
    console.warn('editworld.ts PIXI init failed, archive list unavailable', e);
}

export { worldwindow, create_btn };
