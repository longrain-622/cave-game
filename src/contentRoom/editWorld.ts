import { ApioxObject, apiObjects } from '../apiox/dom.js';
import { apiMethod } from '../apiox/method.js';
import { room } from '../constants/generic.js';
import { textStyle1 } from '../constants/pixiStyles.js';
import { ensureAssetsInit } from '../constants/pixiAssets.js';
import * as PIXI from 'pixi.js';
import localforage from 'localforage';

// worldwindow 相关元素
const gameDifficulty_btn = new ApioxObject(null, 'gameDifficulty-btn');
let gameDifficulty: number = 0;
let gameDifficulties: string[] = [];
let selectedKey: string | null = null;
let archiveRefresh: (() => Promise<void>) | null = null;

const worldwindow = new ApioxObject('worldwindow');
const editWorld = new ApioxObject('editWorld');
const editWorldBtnQuit = new ApioxObject('editWorldBtnQuit');
const editWorldBtnCreate = new ApioxObject('editWorldBtnCreate');
const editWorldBtnDelete = new ApioxObject('editWorldBtnDelete');
export const worldCreator = new ApioxObject('worldCreator');
const create_btn = new ApioxObject(null, 'create-btn');
const back_btn = new ApioxObject(null, 'back-btn');

worldwindow.hide();

back_btn.on('click', (): void => { worldCreator.hide(); editWorld.show(); });
editWorldBtnQuit.on('click', (): void => { worldwindow.hide(); });
editWorldBtnCreate.on('click', (): void => { editWorld.hide(); worldCreator.show(); });

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
apiObjects.win.addEventListener('i18nReady', (): void => {
    updateDifficultyTexts();
});
if ((apiObjects.win as any).t) {
    updateDifficultyTexts();
}
gameDifficulty_btn.on('click', (): void => {
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

    archiveRefresh = async () => {
        try {
            const entries = await localforage.getItem<Array<{ key: string; name: string; lastTime: string }>>('saveIndex') || [];
            renderArchiveList(entries);
        } catch (e) {
            console.warn('editworld.ts cannot refresh world list', e);
        }
    };

    // 与绘制有关的参数
    const ROW_MARGIN = 20;
    const ROW_HEIGHT = 72;
    const ROW_GAP = 8;
    const TEXT_LEFT = 12;
    const NAME_FONT_SIZE = 20;
    const TIME_FONT_SIZE = 18;
    const NAME_Y = ROW_HEIGHT - NAME_FONT_SIZE - TIME_FONT_SIZE - 6;
    const TIME_Y = ROW_HEIGHT - TIME_FONT_SIZE - 2;

    // 滚动条
    let scrollY = 0;
    let maxScroll = 0;
    const SB_W = 16;
    const SB_M = 0;

    // 全屏透明背景用于捕获空白区域的鼠标事件
    const eventBg = new PIXI.Graphics();
    eventBg.beginFill(0x000000, 0.001);
    eventBg.drawRect(0, 0, archiveApp.screen.width, archiveApp.screen.height);
    eventBg.endFill();
    eventBg.eventMode = 'static';
    eventBg.cursor = 'default';
    archiveApp.stage.addChildAt(eventBg, 0);

    // 滚动条图形（保持在最上层）
    const scrollThumb = new PIXI.Graphics();
    scrollThumb.zIndex = 100;
    archiveApp.stage.addChild(scrollThumb);

    // 拖拽状态
    let dragData: { startY: number; startScroll: number } | null = null;

    function updateScrollbar(): void {
        const vh = archiveApp.screen.height;
        const totalH = ctr.children.length * (ROW_HEIGHT + ROW_GAP) + 8;
        maxScroll = Math.max(0, totalH - vh);

        scrollThumb.clear();
        scrollThumb.eventMode = 'none';

        if (maxScroll <= 0) {return;}

        const sx = archiveApp.screen.width - SB_W - SB_M;

        // 滑块
        const thH = Math.max(24, vh * (vh / totalH));
        const thY = (scrollY / maxScroll) * (vh - thH);
        scrollThumb.beginFill(0x999999, 0.8);
        scrollThumb.drawRect(sx, thY, SB_W, thH);
        scrollThumb.endFill();
        scrollThumb.eventMode = 'static';
        scrollThumb.cursor = 'pointer';

        scrollThumb.off('pointerdown');
        scrollThumb.on('pointerdown', (e: any) => {
            dragData = { startY: e.globalY, startScroll: scrollY };
            e.stopPropagation();
        });
    }

    // 滚轮滚动（内容区域 + 空白区域）
    function handleWheel(e: any): void {
        if (maxScroll <= 0) {return;}
        const step = e.deltaY > 0 ? ROW_HEIGHT : -ROW_HEIGHT;
        scrollY = Math.max(0, Math.min(maxScroll, scrollY + step));
        ctr.position.y = -Math.floor(scrollY);
        updateScrollbar();
    }

    ctr.eventMode = 'static';
    ctr.on('wheel', handleWheel);
    eventBg.on('wheel', handleWheel);

    // 拖拽滑块
    archiveApp.stage.on('pointermove', (e: any) => {
        if (!dragData) {return;}
        const vh = archiveApp.screen.height;
        const totalH = ctr.children.length * (ROW_HEIGHT + ROW_GAP) + 8;
        const maxS = Math.max(0, totalH - vh);
        if (maxS <= 0) {return;}
        const thH = Math.max(24, vh * (vh / totalH));
        const dy = e.globalY - dragData.startY;
        scrollY = Math.max(0, Math.min(maxS, dragData.startScroll + (dy / (vh - thH)) * maxS));
        ctr.position.y = -Math.floor(scrollY);
        updateScrollbar();
    });

    archiveApp.stage.on('pointerup', () => { dragData = null; });
    archiveApp.stage.on('pointerupoutside', () => { dragData = null; });

    //滚动条触摸控制
    {
        eventBg.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
            if (maxScroll <= 0) {return;}
            // 只处理直接点击在 eventBg 本身的情况（即点击空白区域）
            if (event.target !== eventBg) {return;}

            const x = event.global.x;
            const y = event.global.y;
            const sx = archiveApp.screen.width - SB_W - SB_M;
            if (x < sx || x > sx + SB_W) {return;} // 不在滚动条轨道内

            const vh = archiveApp.screen.height;
            const totalH = ctr.children.length * (ROW_HEIGHT + ROW_GAP) + 8;
            const thH = Math.max(24, vh * (vh / totalH));
            const thumbY = (scrollY / maxScroll) * (vh - thH);

            // 如果点击在滑块上则忽略（由滑块自己的拖拽处理）
            if (y >= thumbY && y <= thumbY + thH) {return;}

            // 计算滚动比例并跳转
            const ratio = y / (vh - thH);
            scrollY = Math.max(0, Math.min(maxScroll, ratio * maxScroll));
            ctr.position.y = -Math.floor(scrollY);
            updateScrollbar();
            event.stopPropagation(); // 阻止进一步冒泡（可选）
        });
    }

    function renderArchiveList(entries: Array<{ key: string; name: string; lastTime: string }>): void {
        ctr.removeChildren();
        const rowWidth = archiveApp.screen.width - ROW_MARGIN * 2;
        let y = 8;

        for (const entry of entries) {
            const row = new PIXI.Container();
            row.eventMode = 'static';
            row.cursor = 'pointer';
            row.position.set(ROW_MARGIN, y);
            row.hitArea = new PIXI.Rectangle(0, 0, rowWidth, ROW_HEIGHT);

            const bg = new PIXI.Graphics(); //未选中时不绘制任何背景
            row.addChild(bg);

            const nameText = new PIXI.Text(entry.name, textStyle1(NAME_FONT_SIZE));
            nameText.position.set(TEXT_LEFT, NAME_Y);
            row.addChild(nameText);

            const timeText = new PIXI.Text(entry.lastTime, textStyle1(TIME_FONT_SIZE));
            timeText.style.fill = '#aaaaaa';
            timeText.position.set(TEXT_LEFT, TIME_Y);
            row.addChild(timeText);

            (row as any)._key = entry.key;
            (row as any)._bg = bg;
            (row as any)._rowWidth = rowWidth;

            row.on('pointerdown', () => { selectArchive(entry.key, ctr); });

            ctr.addChild(row);
            y += ROW_HEIGHT + ROW_GAP;
        }
        // 滚动状态同步
        const totalH = ctr.children.length * (ROW_HEIGHT + ROW_GAP) + 8;
        const maxS = Math.max(0, totalH - archiveApp.screen.height);
        scrollY = Math.min(scrollY, maxS);
        ctr.position.y = -Math.floor(scrollY);
        updateScrollbar();
    }

    //异步初始化：加载字体 + 读取存档
    (async () => {
        try {
            await ensureAssetsInit();
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
        selectedKey = key;
        for (const child of ctr.children) {
            const row = child as PIXI.Container;
            const bg = (row as any)._bg as PIXI.Graphics;
            const rw = (row as any)._rowWidth as number;
            const isSelected = (row as any)._key === key;

            bg.clear();
            if (isSelected) {
                //选中态：深色底色 + 厚黑边框
                bg.lineStyle(2, 0x808080, 1);
                bg.beginFill(0x000000, 0.4);
                bg.drawRect(0, 0, rw, ROW_HEIGHT);
                bg.endFill();
            }
            //未选中：不绘制任何背景
        }
    }
} catch (e) {
    console.warn('editworld.ts PIXI init failed, archive list unavailable', e);
}

editWorldBtnDelete.on('click', async () => {
    if (!selectedKey) {return;}
    try {
        await localforage.removeItem(selectedKey);
        const index = await localforage.getItem<Array<{ key: string; name: string; lastTime: string }>>('saveIndex') || [];
        const updated = index.filter(e => e.key !== selectedKey);
        await localforage.setItem('saveIndex', updated);
        selectedKey = null;
        if (archiveRefresh) {await archiveRefresh();}
    } catch (e) {
        console.warn('editworld.ts delete world failed', e);
    }
});

/** 返回当前正在被选中世界的名称，若无选中则返回 null */
export async function getSelectedWorldName(): Promise<string | null> {
    if (!selectedKey) {return null;}
    try {
        const entries = await localforage.getItem<Array<{ key: string; name: string; lastTime: string }>>('saveIndex') || [];
        const entry = entries.find(e => e.key === selectedKey);
        return entry ? entry.name : null;
    } catch {
        return null;
    }
}

export { worldwindow, create_btn };
