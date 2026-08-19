// audioManager.ts
import { eventBus } from './eventBus.js';
import { soundManager } from './soundManager.js';
import { getRandomInt } from '../const.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';

function playBlockSound(id: number, isBreaking: boolean): void {
    switch (id) {
        case idOfBlock.grass: case idOfBlock.invicon_grass: case idOfBlock.deadBush:
            switch (getRandomInt(0, 1)) {
                case 0: soundManager.play('grassDig1'); break;
                case 1: soundManager.play('grassDig2'); break;
            }
            break;

        case idOfBlock.dirt: case idOfBlock.sand: case idOfBlock.snowGrass:
            switch (getRandomInt(0, 3)) {
                case 0: soundManager.play('gravel1'); break;
                case 1: soundManager.play('gravel2'); break;
                case 2: soundManager.play('gravel3'); break;
                case 3: soundManager.play('gravel4'); break;
            }
            break;

        case idOfBlock.stone: case idOfBlock.cobblestone: case idOfBlock.sandstone:
        case idOfBlock.coal_ore: case idOfBlock.iron_ore:
        case idOfBlock.furnace:
        case idOfBlock.andesite: case idOfBlock.diorite: case idOfBlock.granite:
        case idOfBlock.bedrock:
            soundManager.play('stone4');
            break;

        case idOfBlock.oak: case idOfBlock.planks: case idOfBlock.crafting_table:
        case idOfBlock.oak_door_bottom: case idOfBlock.oak_door_top: case idOfBlock.oak_door_bottom_open: case idOfBlock.oak_door_top_open:
        case idOfBlock.chest:
            switch (getRandomInt(0, 2)) {
                case 0: soundManager.play('woodbreak1'); break;
                case 1: soundManager.play('woodbreak2'); break;
                case 2: soundManager.play('woodbreak3'); break;
            }
            break;

        case idOfBlock.leaves:
            soundManager.play('leavebreak');
            break;

        case idOfBlock.cactus:
            soundManager.play('cactus_break');
            break;

        case idOfBlock.glass:
            if (isBreaking) {
                switch (getRandomInt(0, 2)) {
                    case 0: soundManager.play('glassBreak1'); break;
                    case 1: soundManager.play('glassBreak2'); break;
                    case 2: soundManager.play('glassBreak3'); break;
                }
            } else {
                soundManager.play('stone4');
            }
            break;
    }
}

eventBus.on('block:break', (blockId: number) => {
    playBlockSound(blockId, true);
});
eventBus.on('block:put', (blockId: number) => {
    playBlockSound(blockId, false);
});

eventBus.on('item:pickup', () => {
    soundManager.play('pop', 0.4);
});

eventBus.on('player:hurt', () => {
    switch (getRandomInt(0, 2)) {
        case 0: soundManager.play('playerhurt1'); break;
        case 1: soundManager.play('playerhurt2'); break;
        case 2: soundManager.play('playerhurt3'); break;
    }
});

eventBus.on('player:attack', () => {
    soundManager.play('strong' + String(getRandomInt(1, 2)));
});

