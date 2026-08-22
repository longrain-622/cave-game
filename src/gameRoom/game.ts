import { playerLoop } from './player.js';
import { room } from '../constants/generic.js';
import { mouseAct } from './mouse.js';
import { updateWorldPixi, updateMouseSprites } from './rendering/rendering.js';

import { animalsLoop } from './animals/animals.js';
import { animalArray } from './animals/animalIds.js';
import { drawAnimals } from './animals/animalDraw.js';

import { gameGuiLoop } from './gui/gameGUI/gameGuiState.js';
import { dropArray, dropLoop } from './dropped/droppedItem.js';
import { drawDeadPage } from './gui/gameGUI/death.js';

import { particleArray, particleAct, drawParticles } from './particle.js';
import { skyLoop } from './nature/sky.js';
import { createChunkAnyTime } from './nature/createWorld.js';
import { entityBlock_array, look_entityBlock } from './nature/entityBlock.js';
import { lookBlocks } from './nature/blockMecha/blockMechanism.js';

import { ApioxObject } from '../apiox/dom.js';

//设置房间大小
export const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
gameRoom.domstyle('width', String(room.width) + 'px');
gameRoom.domstyle('height', String(room.height) + 'px');

//主循环
export function gameLoop(): void {
    createChunkAnyTime();

    playerLoop();
    updateWorldPixi();
    updateMouseSprites();
    mouseAct();

    if (animalArray.length > 0) {animalsLoop(); drawAnimals();}
    if (dropArray.length > 0) {dropLoop();}
    if (particleArray.length > 0) {particleAct(); drawParticles();}
    if (entityBlock_array.length > 0) {look_entityBlock();}
    skyLoop();

    lookBlocks();
    gameGuiLoop();
    drawDeadPage();
}
