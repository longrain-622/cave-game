// main.ts
import { contentLoop, _room_ } from './contentRoom/content.js';
import { loadScripts } from './LoadScripts.js';
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