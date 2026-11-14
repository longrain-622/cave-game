import { apioxEvent } from '../../apiox/event.js';
import { loseItem } from '../dropped/droppedItem.js';
import { isClient } from '../session.js';
import { player, playerState } from '../player.js';
import { uistate } from '../gui/uiState.js';
import { mouse } from '../mouse.js';
import { enableKeyDoubleClickDetection } from '../others/const.js';

function main(): void {
    if (isClient()) {return;}

    enableKeyDoubleClickDetection();

    apioxEvent.onKeyDoubleClick((detail): void => {
        if (!(detail.key === 'a' || detail.key === 'd')) {return;}
        if (!(player.state === playerState.normal && player.can_jump)) {return;}
        player.acc = 2;
    });

    apioxEvent.onKeyDown((e): void => {
        if (uistate.invenUI_isOpening()) {return;}
        switch (e.key) {
            case 'a': player.face = -1; player.left = 1; break;
            case 'd': player.face = 1; player.right = 1; break;
            case 'w': case ' ':
                player.jumpHeld = true;
                if (player.state === playerState.swimming) {break;}
                if (player.can_jump && !uistate.invenUI_isOpening()) {
                    player.vsp = player.jumpspeed;
                    player.can_jump = false;
                }
                break;
        }
    });

    apioxEvent.onKeyUp((e): void => {
        switch (e.key) {
            case 'a': case 'd':
                player.left = 0;
                player.right = 0;
                player.acc = 0;
                break;
            case 'w': case ' ':
                player.jumpHeld = false;
                break;
        }
    });

    apioxEvent.listenGlobal('mousedown', (): void => {
        if (!uistate.invenUI_isOpening() && mouse.can_use) {
            player.needRotateHand = true;
        }
    });

    apioxEvent.onKeyDown((e): void => { // 丢弃物品
        if (e.key !== 'q') {return;}
        loseItem();
    });
}

main();
