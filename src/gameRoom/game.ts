import { playerLoop, updatePlayerState } from './player.js';
import { room } from '../constants/generic.js';
import { mouseAct } from './input/mouse.js';
import { updateWorldPixi, updateMouseSprites } from './rendering/rendering.js';
import { blockFrameLoop } from './nature/blockFrameState.js';
import { updatePlayerRender } from './rendering/actors/playerRender.js';

import { animalsLoop, natureSpawnAnimals } from './animals/animals.js';
import { animalArray } from './animals/animalIds.js';
import { drawAnimals } from './rendering/actors/animalRender.js';

import { gameGuiLogicLoop, gameGuiRenderingLoop } from './gui/gameGUI/gameGuiState.js';
import { dropArray, dropsX } from './dropped/droppedItem.js';
import { drawDrops } from './rendering/items/dropRender.js';
import { drawDeadPage } from './gui/gameGUI/death.js';
import { updateDebugScreen } from './gui/contentGUI/debugScreen.js';

import { particleArray, particleAct } from './particle.js';
import { drawParticles } from './rendering/items/particleRender.js';
import { skyLogicLoop } from './nature/sky.js';
import { skyRendering } from './rendering/world/skyRender.js';
import { createChunkAnyTime } from './nature/createWorld.js';
import { entityBlock_array, entityBlockLogic } from './nature/entityBlock.js';
import { renderingEntityBlock } from './rendering/world/entityBlockRender.js';
import { lookBlocks } from './nature/blockMecha/blockMechanism.js';

import { ApioxObject } from '../apiox/dom.js';
import { notEventAudio } from './others/audioManager.js';

export const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
gameRoom.domstyle('width', String(room.width) + 'px');
gameRoom.domstyle('height', String(room.height) + 'px');

function logicLoop(delta: number): void {
    createChunkAnyTime();
    blockFrameLoop(delta);
    updatePlayerState();
    playerLoop(delta);
    mouseAct(delta);
    natureSpawnAnimals(delta);
    if (animalArray.length > 0) {animalsLoop(delta);}
    if (dropArray.length > 0) {dropsX(delta);}
    if (particleArray.length > 0) {particleAct(delta);}
    if (entityBlock_array.length > 0) {entityBlockLogic(delta);}
    skyLogicLoop(delta);
    lookBlocks(delta);
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
    gameGuiRenderingLoop();
    drawDeadPage();
    updateDebugScreen();
}

export function gameLoop(delta: number): void {
    logicLoop(delta);
    renderingLoop();
}
