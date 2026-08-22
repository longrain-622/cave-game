enum idOfBlock {
    fire = -10,
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
    furnace = 14,
    glass = 15,
    andesite = 16, diorite = 17, granite = 18,
    bedrock = 19,
}

// 用于存储方块属性
interface Blocks {
    id: number;
    hardness: number;
}

function newBlock(id: number, hardness: number): Blocks {
    return { id: id, hardness: hardness };
}

// -1硬度表示无法挖掘
const hardness: {
    dirt: number; stone: number;
    oak: number; planks: number;
    no: number;
} = {
    dirt: 5,
    stone: 64,
    oak: 18,
    planks: 22,
    no: -1,
};

const block = {
    grass: newBlock(idOfBlock.grass, hardness.dirt),
    dirt: newBlock(idOfBlock.dirt, hardness.dirt),
    stone: newBlock(idOfBlock.stone, hardness.stone),
    oak: newBlock(idOfBlock.oak, hardness.oak),
    leaves: newBlock(idOfBlock.leaves, 0),
    cobblestone: newBlock(idOfBlock.cobblestone, hardness.stone),
    sand: newBlock(idOfBlock.sand, hardness.dirt - 1),
    snowGrass: newBlock(idOfBlock.snowGrass, hardness.dirt),
    sandstone: newBlock(idOfBlock.sandstone, hardness.stone),
    planks: newBlock(idOfBlock.planks, hardness.planks),
    crafting_table: newBlock(idOfBlock.crafting_table, hardness.planks),
    iron_ore: newBlock(idOfBlock.iron_ore, hardness.stone + 4),
    coal_ore: newBlock(idOfBlock.coal_ore, hardness.stone + 2),
    invicon_grass: newBlock(idOfBlock.invicon_grass, 0),
    cactus: newBlock(idOfBlock.cactus, 4),
    deadBush: newBlock(idOfBlock.deadBush, 0),
    oak_door_bottom: newBlock(idOfBlock.oak_door_bottom, hardness.planks),
    oak_door_top: newBlock(idOfBlock.oak_door_top, hardness.planks),
    oak_door_bottom_open: newBlock(idOfBlock.oak_door_bottom_open, hardness.planks),
    oak_door_top_open: newBlock(idOfBlock.oak_door_top_open, hardness.planks),
    stone_dark: newBlock(idOfBlock.stone_dark, hardness.no),
    chest: newBlock(idOfBlock.chest, hardness.planks),
    furnace: newBlock(idOfBlock.furnace, hardness.stone),
    glass: newBlock(idOfBlock.glass, 2),
    andesite: newBlock(idOfBlock.andesite, hardness.stone),
    diorite: newBlock(idOfBlock.diorite, hardness.stone),
    granite: newBlock(idOfBlock.granite, hardness.stone),
    bedrock: newBlock(idOfBlock.bedrock, hardness.no),
    fire: newBlock(idOfBlock.fire, hardness.no),
};

const blocksArray: Blocks[] = [
    block.grass, block.dirt, block.stone, block.oak, block.leaves, block.cobblestone,
    block.sand, block.snowGrass, block.sandstone, block.planks, block.crafting_table, block.iron_ore, block.coal_ore,
    block.invicon_grass, block.cactus, block.deadBush,
    block.oak_door_bottom, block.oak_door_top, block.oak_door_bottom_open, block.oak_door_top_open,
    block.stone_dark, block.chest, block.furnace,
    block.glass,
    block.andesite, block.diorite, block.granite,
    block.bedrock, block.fire,
];

function main(): void {
    blocksArray.sort((a, b) => a.id - b.id);
}
main();

export { blocksArray, Blocks, idOfBlock };