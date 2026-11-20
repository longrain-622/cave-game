import { player, applyClientPrediction } from './player.js';
import { room } from '../constants/generic.js';
import { mouse } from './mouse.js';
import { updateWorldPixi, updateMouseSprites } from './rendering/rendering.js';
import { blockFrameLoop } from './nature/blockFrameState.js';
import { updatePlayerRender } from './rendering/actors/playerRender.js';
import { logicLoop } from './logicLoop.js';

import { drawAnimals } from './rendering/actors/animalRender.js';

import { heartsAct } from './gui/gameGUI/gameGuiState.js';
import { drawHeart } from './rendering/gui/gameGUI/hearts.js';
import { drawInventory } from './rendering/gui/gameGUI/inventory.js';
import { drawWorkbench } from './rendering/gui/gameGUI/blockGUI/crafting_table.js';
import { drawChest } from './rendering/gui/gameGUI/blockGUI/chest.js';
import { drawFurnace } from './rendering/gui/gameGUI/blockGUI/furnace.js';
import { updatePauseMenu } from './rendering/gui/contentGUI/gameContent.js';
import { floatContainer } from './rendering/gui/application.js';
import { uistate } from './gui/uiState.js';
import { drawDrops } from './rendering/items/dropRender.js';
import { drawDeadPage } from './rendering/gui/gameGUI/death.js';
import { updateDebugScreen } from './rendering/gui/contentGUI/debugScreen.js';

import { drawParticles } from './rendering/items/particleRender.js';
import { skyRendering } from './rendering/world/skyRender.js';
import { renderingEntityBlock } from './rendering/world/entityBlockRender.js';

import { ApioxObject } from '../apiox/dom.js';
import { notEventAudio } from './others/audioManager.js';
import { isClient } from './session.js';
import { clientNetTick, recordPredictedFrame } from './net/clientNet.js';
import { hostNetTick } from './net/hostNet.js';
import type { PlayerInputState } from '../../shared/netProtocol.js';
import { checkEventBus } from '../others/eventFunctionUser.js';
import { clientInputTick } from './input/keyboardInput.js';

export const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');

function main(): void {
    gameRoom.domstyle('width', String(room.width) + 'px');
    gameRoom.domstyle('height', String(room.height) + 'px');
}
main();

function renderingLoop(): void {
    updatePlayerRender();
    updateWorldPixi();
    updateMouseSprites();
    drawAnimals();
    drawDrops();
    drawParticles();
    renderingEntityBlock();
    skyRendering();

    if (player.hp > 0) {
        drawHeart();
        floatContainer.visible = uistate.invenUI_isOpening();
        drawInventory();
        drawWorkbench();
        drawChest();
        drawFurnace();
    }

    updatePauseMenu();
    drawDeadPage();
    updateDebugScreen();
}

function clientLogicLoop(delta: number): void {
    const input = clientInputTick();
    const recordedInput: PlayerInputState = { ...input };
    player.rightOnMouse = mouse.x > player.screen_x + player.width / 2;
    applyClientPrediction(player, delta, input);
    recordPredictedFrame(recordedInput, delta);
    clientNetTick(delta);
    blockFrameLoop(delta);
    if (player.hp > 0) {heartsAct(delta);}
}

function interactionLoop(): void {
    checkEventBus();
}

export function gameLoop(delta: number): void {
    if (isClient()) {
        clientLogicLoop(delta);
    } else {
        logicLoop(delta);
        hostNetTick();
    }
    notEventAudio();
    interactionLoop();
    renderingLoop();
}
