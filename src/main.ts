// main.ts
import { contentLoop, _room_ } from './contentRoom/content.js';
import { loadScripts } from './LoadScripts.js';
import { Ticker } from 'pixi.js';

// 游戏链通过运行时绝对路径加载(与 LoadScripts 一致)。
// 避免 Vite 打包游戏链:循环依赖 + 顶层 await 会产生语法错误,且与 LoadScripts 运行时加载的模块构成双实例。
const GAME_ENTRY = '/js/gameRoom/game.js';

let gameLoopFn: (() => void) | null = null;
let gameLoaded: boolean = false;
let loading: boolean = false; //加载中

async function ensureGameLoaded() {
    if (gameLoaded || loading) {return;}
    loading = true;
    await loadScripts(); //加载所有附加模块
    const gameModule = await import(GAME_ENTRY); //动态导入
    gameLoopFn = gameModule.gameLoop;
    gameLoaded = true;
    loading = false;
    console.log('Game ready');
}

// 主驱动循环
function mainLoop() {
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