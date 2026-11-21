import { apioxEvent } from '../../apiox/event.js';
import { apioxNet } from '../../apiox/net.js';
import { loseItem } from '../dropped/droppedItem.js';
import { isClient } from '../session.js';
import { player, playerState } from '../player.js';
import { uistate } from '../gui/uiState.js';
import { mouse } from '../mouse.js';
import { enableKeyDoubleClickDetection } from '../others/const.js';
import type { PlayerInputMessage, PlayerInputState } from '../../../shared/netProtocol.js';

const clientInput: PlayerInputState = {
    left: 0,
    right: 0,
    jumpHeld: false,
    jumpPressed: false,
    acc: 0,
    face: -1,
    uiBlocked: false,
    tick: 0,
};

let clientInputTickCount: number = 0;

/**
 * 每个客户端逻辑步收集一次输入：这一步的输入必须发给主机（主机按 tick 精确消费），
 * 同时返回本地预测用的副本。jumpPressed 是单帧事件，发送与本地预测都只消费一次。
 */
export function clientInputTick(): PlayerInputState {
    const blocked: boolean = uistate.invenUI_isOpening();
    if (blocked !== clientInput.uiBlocked) {
        clientInput.uiBlocked = blocked;
    }

    clientInputTickCount++;
    clientInput.tick = clientInputTickCount;

    const predictionInput: PlayerInputState = { ...clientInput };

    const message: PlayerInputMessage = {
        type: 'player:input',
        seq: clientInputTickCount,
        ...clientInput,
    };
    apioxNet.sendClientMessage(message);
    clientInput.jumpPressed = false;

    return predictionInput;
}

function main(): void {
    enableKeyDoubleClickDetection();

    apioxEvent.onKeyDoubleClick((detail): void => {
        if (!(detail.key === 'a' || detail.key === 'd')) {return;}

        if (isClient()) {
            clientInput.acc = 2;
            return;
        }

        if (!(player.state === playerState.normal && player.can_jump)) {return;}
        player.acc = 2;
    });

    apioxEvent.onKeyDown((e): void => {
        if (uistate.invenUI_isOpening()) {return;}

        if (isClient()) {
            switch (e.key) {
                case 'a':
                    clientInput.face = -1;
                    clientInput.left = 1;
                    break;
                case 'd':
                    clientInput.face = 1;
                    clientInput.right = 1;
                    break;
                case 'w': case ' ':
                    clientInput.jumpHeld = true;
                    clientInput.jumpPressed = true;
                    break;
            }
            return;
        }

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
        if (isClient()) {
            switch (e.key) {
                case 'a': case 'd':
                    clientInput.left = 0;
                    clientInput.right = 0;
                    clientInput.acc = 0;
                    break;
                case 'w': case ' ':
                    clientInput.jumpHeld = false;
                    break;
            }
            return;
        }

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
        if (isClient()) {return;}
        if (!uistate.invenUI_isOpening() && mouse.can_use) {
            player.needRotateHand = true;
        }
    });

    apioxEvent.onKeyDown((e): void => { // 丢弃物品
        if (isClient()) {return;}
        if (e.key !== 'q') {return;}
        loseItem();
    });
}

main();
