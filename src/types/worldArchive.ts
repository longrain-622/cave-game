//存储索引中用到的条目元信息
import { BlockState } from "../gameRoom/world.js";

interface SaveEntry {
    key: string;
    name: string;
    lastTime: string;
}

//玩家的所有信息
interface PlayerArchive {
    hp: number;
    x: number; y: number;
}

//单个动物的信息
interface AnimalArchive {
    type: number;
    x: number; y: number; hp: number;
}

interface SlotMessage {
    item: number; num: number;
    durability: number;
}

//玩家背包的信息
interface InventoryArchive {
    items: SlotMessage[];
}

interface ChestAichive {
    world_x: number; world_y: number;
    fold: SlotMessage[];
}

interface FurnaceArchive {
    world_x: number; world_y: number;
    fuel: SlotMessage;
    input: SlotMessage;
    output: SlotMessage;
    fuelProgress: number; // 燃料燃烧的进度
    outputProgress: number;
}

interface EntityBlockArchive {
    id: number;
    world_x: number; world_y: number;
    x: number; y: number;
    vsp: number; timer: number;
}

//整个世界的信息
interface WorldArchive {
    version: string;
    name: string;
    lastTime: string;
    world: number[][];
    palette?: BlockState[]; // 调色板（世界格存的是其索引）；旧存档没有该字段，读档时按类型 id 迁移
    lowest_point: number;
    left_number: number; // 左侧已生成的区块数，读档时用于保持噪声坐标与数组坐标对齐
    player: PlayerArchive;
    animals: AnimalArchive[];
    inventory: InventoryArchive;
    chests: ChestAichive[];
    furnaces: FurnaceArchive[];
    entityBlocks: EntityBlockArchive[];
    skyTimer: number;
    seed: number; // Perlin 噪声种子，用于读档后生成连续的新区块
}

export { WorldArchive, SaveEntry, AnimalArchive, SlotMessage, ChestAichive, EntityBlockArchive, FurnaceArchive }