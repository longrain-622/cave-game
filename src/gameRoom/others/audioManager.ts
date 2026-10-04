// audioManager.ts
import { eventBus } from './eventBus.js';
import { soundManager } from './soundManager.js';
import { getRandomInt } from '../../constants/utils.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { player, playerState } from '../player.js';

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
        case idOfBlock.chest: case idOfBlock.torch:
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

function registerEventAudio(): void {
    eventBus.on('block:break', (blockId: number): void => {
        playBlockSound(blockId, true);
    });

    eventBus.on('block:put', (blockId: number): void => {
        playBlockSound(blockId, false);
    });

    eventBus.on('item:pickup', (): void => {
        soundManager.play('pop', 0.4);
    });

    eventBus.on('player:hurt', (): void => {
        switch (getRandomInt(0, 2)) {
            case 0: soundManager.play('playerhurt1'); break;
            case 1: soundManager.play('playerhurt2'); break;
            case 2: soundManager.play('playerhurt3'); break;
        }
    });

    eventBus.on('player:attack', (): void => {
        switch (getRandomInt(0, 1)) {
            case 0: soundManager.play('strong1'); break;
            case 1: soundManager.play('strong2'); break;
        }
    });

    eventBus.on('player:fallInWater', (): void => {
        soundManager.playOnce('waterSplash', 1, 'player:swimming');
    });
}

export function notEventAudio(): void { // run it in the loop
    if (player.state === playerState.swimming && !(player.left === 0 && player.right === 0)) {
        switch (getRandomInt(0, 2)) {
            case 0: soundManager.playOnce('swim1', 1, 'player:swimming'); break;
            case 1: soundManager.playOnce('swim2', 1, 'player:swimming'); break;
            case 2: soundManager.playOnce('swim3', 1, 'player:swimming'); break;
        }
    }
}

function main(): void {
    registerEventAudio();
}
main();