// main.ts
import { contentLoop, _room_ } from './contentRoom/content.js';
import { loadScripts } from './LoadScripts.js';
import { isClient } from './gameRoom/net/session.js';
import { Ticker } from 'pixi.js';

let gameLoopFn: ((delta: number) => void) | null = null;
let gameLoaded: boolean = false;
let loading: boolean = false;

async function ensureGameLoaded(): Promise<void> {
    if (gameLoaded || loading) {return;}
    loading = true;
    await loadScripts(); // Load all modules
    const gameModule = await import('./gameRoom/game.js');
    gameLoopFn = gameModule.gameLoop;

    // 客户端必须在全部游戏模块（尤其 offsetElements）加载完成后再开始消费网络事件。
    if (isClient()) {
        const netModule = await import('./gameRoom/net/clientNet.js');
        netModule.startClientNet();
    }

    gameLoaded = true;
    loading = false;
    console.log('Game ready');
}

// main loop
Ticker.shared.add((delta: number): void => {
    switch (_room_) {
        case 0:
            contentLoop(delta);
            break;
        case 1:
            if (!gameLoaded) {
                ensureGameLoaded();
            } else {
                if (gameLoopFn) {gameLoopFn(delta);}
            }
            break;
    }
});