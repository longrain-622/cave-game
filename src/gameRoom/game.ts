import { playerLoop } from './player.js';
import { room } from './const.js';
import { mouseAct } from './mouse.js';
import { updateWorldPixi, updateMouseSprites } from './rendering.js';

import { animalArray, animalsLoop } from './animals/animals.js';
import { drawAnimals, ctx_entity, canvas_entity } from './animals/animalDraw.js';

import { inventoryLoop, ctx_gui, canvas_gui } from './gui/gameGUI/inventory.js';
import { dropArray, dropLoop } from './dropped/droppedItem.js';
import { drawDeadPage } from './gui/gameGUI/death.js';

import { particleArray, particleAct, drawParticles } from './particle.js';
import { skyLoop, ctx_sky, canvas_sky } from './nature/sky.js';
import { createChunkAnyTime } from './nature/createWorld.js';
import { entityBlock_array, look_entityBlock } from './nature/entityBlock.js';
import { lookBlocks } from './nature/blockMecha/blockMechanism.js';

import { ApioxObject } from '../apiox/dom.js';

//设置房间大小
let gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
gameRoom.domstyle('width', String(room.width) + 'px');
gameRoom.domstyle('height', String(room.height) + 'px');

//主循环
export function gameLoop(): void {
    //先清空画布
    ctx_gui.clearRect(0, 0, canvas_gui.width, canvas_gui.height);
    ctx_entity.clearRect(0, 0, canvas_entity.width, canvas_entity.height);
    ctx_sky.clearRect(0, 0, canvas_sky.width, canvas_sky.height);

    createChunkAnyTime();

    playerLoop();
    updateWorldPixi();
    updateMouseSprites();
    mouseAct();

    if(animalArray.length > 0) {animalsLoop(); drawAnimals();}
    if(dropArray.length > 0) {dropLoop();}
    if(particleArray.length > 0) {particleAct(); drawParticles();}
    if(entityBlock_array.length > 0) {look_entityBlock();}
    skyLoop();

    lookBlocks();
    inventoryLoop();
    drawDeadPage();
}
