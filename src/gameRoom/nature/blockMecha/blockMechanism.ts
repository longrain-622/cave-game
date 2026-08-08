import { world, isOutOfBounds, setWorldState } from '../../world.js';
import { player } from '../../player.js';
import { sand_gravity, cactus_and_deadBush, grass_and_dirt, inviconGrass, door } from './bmFunction.js';
import { blocksArray } from './blocks.js';

const look_range: number = 16; //渲染的范围的一半
let times: number = 0;

function lookBlocks() { //检测方块并触发方块的机制
    times = (times + 1) % 4;

    let look_y: number = Math.floor(player.y / 64) - look_range;
    for(let i = 0; i < 2*look_range; i++) {
        let look_x: number = Math.floor(player.x / 64) + Math.floor((times / 2 - 1) * look_range);
        if (isOutOfBounds(look_y, look_x)) {continue;}

        for(let k = 0; k < look_range / 2; k++) {
            if (isOutOfBounds(look_y, look_x)) {continue;}
            let looking_block = world[look_y][look_x];

            looking_block = grass_and_dirt(looking_block, look_x, look_y);
            looking_block = sand_gravity(looking_block, look_x, look_y);
            looking_block = inviconGrass(looking_block, look_x, look_y);
            looking_block = cactus_and_deadBush(looking_block, look_x, look_y);
            looking_block = door(looking_block, look_x, look_y);

            setWorldState({ x: look_x, y: look_y }, { type: looking_block });
            look_x += 1;
        }

        look_y += 1;
    }
}

function main(): void {
    blocksArray.sort((a, b) => a.id - b.id);
}
main();

export { lookBlocks };
