// audioManager.ts
import { eventBus } from './eventBus.js';
import { soundManager } from './soundManager.js';
import { getRandomInt } from '../const.js';
import { idOfBlock } from '../nature/blockMecha/blockMechanism.js';

function playBlockSound(blockId: number): void {
    switch(blockId) {
        case idOfBlock.grass: case idOfBlock.invicon_grass: case idOfBlock.deadBush:
            soundManager.play('grassDig' + String(getRandomInt(1, 2)));
            break;
        case idOfBlock.dirt: case idOfBlock.sand: case idOfBlock.snowGrass:
            soundManager.play('gravel' + String(getRandomInt(1, 4)));
            break;
        case idOfBlock.stone: case idOfBlock.cobblestone: case idOfBlock.sandstone: case idOfBlock.coal_ore: case idOfBlock.iron_ore:
            soundManager.play('stone4');
            break;
        case idOfBlock.oak: case idOfBlock.planks: case idOfBlock.crafting_table:
        case idOfBlock.oak_door_bottom: case idOfBlock.oak_door_top: case idOfBlock.oak_door_bottom_open: case idOfBlock.oak_door_top_open:
            soundManager.play('woodbreak' + String(getRandomInt(1, 3)));
            break;
        case idOfBlock.leaves:
            soundManager.play('leavebreak');
            break;
        case idOfBlock.cactus:
            soundManager.play('cactus_break');
            break;
    }
}

eventBus.on('block:break', (blockId: number) => {
    playBlockSound(blockId);
});
eventBus.on('block:put', (blockId: number) => {
    playBlockSound(blockId);
});

eventBus.on('item:pickup', () => {
    soundManager.play('pop', 0.4);
});

eventBus.on('player:hurt', () => {
    soundManager.play('playerhurt');
});

eventBus.on('player:attack', () => {
    soundManager.play('strong' + String(getRandomInt(1, 2)));
});

