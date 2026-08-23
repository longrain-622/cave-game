// main.ts
import { contentLoop, _room_ } from './contentRoom/content.js';
import { loadScripts } from './LoadScripts.js';
import { Ticker } from 'pixi.js';

// 游戏链按需懒加载(与 LoadScripts 一致):字面量动态导入供 Vite 静态分析并分割为异步 chunk,进房间才加载。
let gameLoopFn: (() => void) | null = null;
let gameLoaded: boolean = false;
let loading: boolean = false; //加载中

async function ensureGameLoaded(): Promise<void> {
    if (gameLoaded || loading) {return;}
    loading = true;
    await loadScripts(); //加载所有附加模块
    const gameModule = await import('./gameRoom/game.js'); //动态导入
    gameLoopFn = gameModule.gameLoop;
    gameLoaded = true;
    loading = false;
    console.log('Game ready');
}

// 主驱动循环
function mainLoop(): void {
    switch (_room_) {
        case 0:
            contentLoop();
            break;
        case 1:
            if (!gameLoaded) {
                ensureGameLoaded();
            } else {
                if (gameLoopFn) {gameLoopFn();}
            }
            break;
    }
}
Ticker.shared.add(mainLoop);