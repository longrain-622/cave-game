import { world, isOutOfBounds } from '../../const.js';
import { player } from '../../player.js';
import { sand_gravity, cactus_and_deadBush, grass_and_dirt, inviconGrass, door } from './bmFunction.js';

export enum idOfBlock {
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
const dirt_hardness: number = 5;
const stone_hardness: number = 64;
const oak_hardness: number = 18;
const planks_hardness: number = 22;

//const air = new Blocks(idOfBlock.air, 0);
const grass = new Blocks(idOfBlock.grass, dirt_hardness);
const dirt = new Blocks(idOfBlock.dirt, dirt_hardness);
const stone = new Blocks(idOfBlock.stone, stone_hardness);
const oak = new Blocks(idOfBlock.oak, oak_hardness);
const leaves = new Blocks(idOfBlock.leaves, 0);
const cobblestone = new Blocks(idOfBlock.cobblestone, stone_hardness);
const sand = new Blocks(idOfBlock.sand, dirt_hardness - 1);
const snowGrass = new Blocks(idOfBlock.snowGrass, dirt_hardness);
const sandstone = new Blocks(idOfBlock.sandstone, stone_hardness);
const planks = new Blocks(idOfBlock.planks, planks_hardness);
const crafting_table = new Blocks(idOfBlock.crafting_table, planks_hardness);
const iron_ore = new Blocks(idOfBlock.iron_ore, stone_hardness + 4);
const coal_ore = new Blocks(idOfBlock.coal_ore, stone_hardness + 2);
const invicon_grass = new Blocks(idOfBlock.invicon_grass, 0);
const cactus = new Blocks(idOfBlock.cactus, 4);
const deadBush = new Blocks(idOfBlock.deadBush, 0);
const oak_door_bottom = new Blocks(idOfBlock.oak_door_bottom, planks_hardness);
const oak_door_top = new Blocks(idOfBlock.oak_door_top, planks_hardness);
const oak_door_bottom_open = new Blocks(idOfBlock.oak_door_bottom_open, planks_hardness);
const oak_door_top_open = new Blocks(idOfBlock.oak_door_top_open, planks_hardness);
const stone_dark = new Blocks(idOfBlock.stone_dark, -1);

const blocksArray: Blocks[] = [
    grass, dirt, stone, oak, leaves, cobblestone,
    sand, snowGrass, sandstone, planks, crafting_table, iron_ore, coal_ore,
    invicon_grass, cactus, deadBush,
    oak_door_bottom, oak_door_top, oak_door_bottom_open, oak_door_top_open,
    stone_dark
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
