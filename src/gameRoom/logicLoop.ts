// logicLoop.ts
// This file maintains a pure logic function logicLoop, and the file itself is also a pure logic file.
import { createChunkAnyTime } from './nature/createWorld.js';
import { offsetElements } from './nature/offsetElements.js';
import { notifyChunkCreate } from './world.js';
import { blockFrameLoop } from './nature/blockFrameState.js';
import { player, playerLoop, updatePlayerState, remotePlayers, remoteInputs, stepRemotePlayer, createEmptyPlayerInput } from './player.js';
import { mouse, mouseAct } from './mouse.js';
import { uistate } from './gui/uiState.js';

import { animalsLoop, natureSpawnAnimals } from './animals/animals.js';
import { animalArray } from './animals/animalIds.js';

import { gameGuiLogicLoop, heartsAct } from './gui/gameGUI/gameGuiState.js';

import { dropArray, dropsX } from './dropped/droppedItem.js';
import { particleArray, particleAct } from './particle.js';
import { skyLogicLoop } from './nature/sky.js';
import { entityBlock_array, entityBlockLogic } from './nature/entityBlock.js';
import { lookBlocks } from './nature/blockMecha/blockMechanism.js';

export function logicLoop(delta: number): void {
    const newChunkBehind: boolean | null = createChunkAnyTime();
    if (newChunkBehind !== null) {
        offsetElements(newChunkBehind);
        notifyChunkCreate(newChunkBehind);
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
}
