// death.ts
// 死亡界面的纯逻辑：复活。
import { player, initPlayerPosition } from '../../player.js';
import { uistate } from '../uiState.js';

export function respawnPlayer(): void {
    if (player.hp > 0) {return;}
    player.hp = 20;
    initPlayerPosition(player);
    uistate.deathUI_isOpening = false;
}
