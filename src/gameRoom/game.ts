import { player, playerLoop, updatePlayerState, remotePlayers, remoteInputs, stepRemotePlayer, createEmptyPlayerInput, applyClientPrediction } from './player.js';
import { room } from '../constants/generic.js';
import { mouse, mouseAct } from './input/mouseInput.js';
import { updateWorldPixi, updateMouseSprites } from './rendering/rendering.js';
import { blockFrameLoop } from './nature/blockFrameState.js';
import { updatePlayerRender } from './rendering/actors/playerRender.js';

import { animalsLoop, natureSpawnAnimals } from './animals/animals.js';
import { animalArray } from './animals/animalIds.js';
import { drawAnimals } from './rendering/actors/animalRender.js';

import { gameGuiLogicLoop } from './gui/gameGUI/gameGuiState.js';
import { drawHeart, heartsAct } from './rendering/gui/gameGUI/hearts.js';
import { drawInventory } from './rendering/gui/gameGUI/inventory.js';
import { drawWorkbench } from './rendering/gui/gameGUI/blockGUI/crafting_table.js';
import { drawChest } from './rendering/gui/gameGUI/blockGUI/chest.js';
import { drawFurnace } from './rendering/gui/gameGUI/blockGUI/furnace.js';
import { updatePauseMenu } from './rendering/gui/contentGUI/gameContent.js';
import { floatContainer } from './rendering/gui/application.js';
import { uistate } from './gui/uiState.js';
import { dropArray, dropsX } from './dropped/droppedItem.js';
import { drawDrops } from './rendering/items/dropRender.js';
import { drawDeadPage } from './rendering/gui/gameGUI/death.js';
import { updateDebugScreen } from './rendering/gui/contentGUI/debugScreen.js';

import { particleArray, particleAct } from './particle.js';
import { drawParticles } from './rendering/items/particleRender.js';
import { skyLogicLoop } from './nature/sky.js';
import { skyRendering } from './rendering/world/skyRender.js';
import { createChunkAnyTime } from './nature/createWorld.js';
import { offsetElements } from './nature/offsetElements.js';
import { entityBlock_array, entityBlockLogic } from './nature/entityBlock.js';
import { renderingEntityBlock } from './rendering/world/entityBlockRender.js';
import { lookBlocks } from './nature/blockMecha/blockMechanism.js';

import { ApioxObject } from '../apiox/dom.js';
import { notEventAudio } from './others/audioManager.js';
import { eventBus } from './others/eventBus.js';
import { isClient } from './session.js';
import { clientNetTick } from './net/clientNet.js';
import { checkEventBus } from '../others/eventFunctionUser.js';
import { clientInputTick } from './input/keyboardInput.js';

export const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');

function main(): void {
    gameRoom.domstyle('width', String(room.width) + 'px');
    gameRoom.domstyle('height', String(room.height) + 'px');
}
main();

function logicLoop(delta: number): void {
    const newChunkBehind: boolean | null = createChunkAnyTime();
    if (newChunkBehind !== null) {
        offsetElements(newChunkBehind);
        eventBus.emit('chunk:create', newChunkBehind);
    }
    blockFrameLoop(delta);
    updatePlayerState(player);
    playerLoop(delta, uistate.invenUI_isOpening(), mouse.x);
    for (const remote of remotePlayers.values()) {
        updatePlayerState(remote);
        stepRemotePlayer(remote, delta, remoteInputs.get(remote.id) ?? createEmptyPlayerInput());
    }
    mouseAct(delta);
    natureSpawnAnimals(delta);
    if (animalArray.length > 0) {animalsLoop(delta);}
    if (dropArray.length > 0) {dropsX(delta);}
    if (particleArray.length > 0) {particleAct(delta);}
    if (entityBlock_array.length > 0) {entityBlockLogic(delta);}
    skyLogicLoop(delta);
    lookBlocks(delta);
    if (player.hp > 0) {heartsAct(delta);}
    gameGuiLogicLoop(delta);
    notEventAudio();
}

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

// 客户端：本地预测自己的移动，远端玩家与主机状态由网络层驱动
function clientLogicLoop(delta: number): void {
    const input = clientInputTick();
    applyClientPrediction(player, delta, input);
    clientNetTick(delta);
    blockFrameLoop(delta);
    if (player.hp > 0) {heartsAct(delta);}
    notEventAudio();
}

function interactionLoop(): void {
    checkEventBus();
}

export function gameLoop(delta: number): void {
    if (isClient()) {
        clientLogicLoop(delta);
    } else {
        logicLoop(delta);
    }
    interactionLoop();
    renderingLoop();
}
