import { world, isOutOfBounds } from '../../const.js';
import { player } from '../../player.js';
import { sand_gravity, cactus_and_deadBush, grass_and_dirt, inviconGrass, door } from './bmFunction.js';

export enum idOfBlock {
    chest = -9,
    stone_dark = -8,
    oak_door_bottom_open = -7, oak_door_top_open = -6,
    deadBush = -5, cactus = -4, invicon_grass = -3,
    oak = -2,

    air = -1,

    grass = 0, dirt = 1, stone = 2, leaves = 3, cobblestone = 4,
    sand = 5, snowGrass = 6, sandstone = 7,
    planks = 8,
    crafting_table = 9,
    iron_ore = 10, coal_ore = 11,
    oak_door_bottom = 12, oak_door_top = 13,
}

//方块类，用于存储方块属性
export class Blocks {
    id: number; hardness: number;

    constructor(id: number, hardness: number) {
        this.id = id;
        this.hardness = hardness;
    }
}

//-1硬度表示无法挖掘
const hardness: {
    dirt: number; stone: number;
    oak: number; planks: number;
} = {
    dirt: 5,
    stone: 64,
    oak: 18,
    planks: 22,
};

const block = {
    grass: new Blocks(idOfBlock.grass, hardness.dirt),
    dirt: new Blocks(idOfBlock.dirt, hardness.dirt),
    stone: new Blocks(idOfBlock.stone, hardness.stone),
    oak: new Blocks(idOfBlock.oak, hardness.oak),
    leaves: new Blocks(idOfBlock.leaves, 0),
    cobblestone: new Blocks(idOfBlock.cobblestone, hardness.stone),
    sand: new Blocks(idOfBlock.sand, hardness.dirt - 1),
    snowGrass: new Blocks(idOfBlock.snowGrass, hardness.dirt),
    sandstone: new Blocks(idOfBlock.sandstone, hardness.stone),
    planks: new Blocks(idOfBlock.planks, hardness.planks),
    crafting_table: new Blocks(idOfBlock.crafting_table, hardness.planks),
    iron_ore: new Blocks(idOfBlock.iron_ore, hardness.stone + 4),
    coal_ore: new Blocks(idOfBlock.coal_ore, hardness.stone + 2),
    invicon_grass: new Blocks(idOfBlock.invicon_grass, 0),
    cactus: new Blocks(idOfBlock.cactus, 4),
    deadBush: new Blocks(idOfBlock.deadBush, 0),
    oak_door_bottom: new Blocks(idOfBlock.oak_door_bottom, hardness.planks),
    oak_door_top: new Blocks(idOfBlock.oak_door_top, hardness.planks),
    oak_door_bottom_open: new Blocks(idOfBlock.oak_door_bottom_open, hardness.planks),
    oak_door_top_open: new Blocks(idOfBlock.oak_door_top_open, hardness.planks),
    stone_dark: new Blocks(idOfBlock.stone_dark, -1),
    chest: new Blocks(idOfBlock.chest, hardness.planks),
};

const blocksArray: Blocks[] = [
    block.grass, block.dirt, block.stone, block.oak, block.leaves, block.cobblestone,
    block.sand, block.snowGrass, block.sandstone, block.planks, block.crafting_table, block.iron_ore, block.coal_ore,
    block.invicon_grass, block.cactus, block.deadBush,
    block.oak_door_bottom, block.oak_door_top, block.oak_door_bottom_open, block.oak_door_top_open,
    block.stone_dark, block.chest
];
blocksArray.sort((a, b) => a.id - b.id);

const look_range: number = 16; //渲染的范围的一半
let times: number = 0;

function lookBlocks() { //检测方块并触发方块的机制
    times = (times + 1) % 4;

    let look_y: number = Math.floor(player.y / 64) - look_range;
    for(let i = 0; i < 2*look_range; i++) {
        let look_x: number = Math.floor(player.x / 64) + Math.floor((times / 2 - 1) * look_range);
        if(isOutOfBounds(look_y, look_x)) {continue;}

        for(let k = 0; k < look_range / 2; k++) {
            if(isOutOfBounds(look_y, look_x)) {continue;}
            let looking_block = world[look_y][look_x];

            looking_block = grass_and_dirt(looking_block, look_x, look_y);
            looking_block = sand_gravity(looking_block, look_x, look_y);
            looking_block = inviconGrass(looking_block, look_x, look_y);
            looking_block = cactus_and_deadBush(looking_block, look_x, look_y);
            looking_block = door(looking_block, look_x, look_y);

            world[look_y][look_x] = looking_block;
            look_x += 1;
        }

        look_y += 1;
    }
}

export { blocksArray, lookBlocks };
