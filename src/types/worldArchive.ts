//存储索引中用到的条目元信息
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

interface EntityBlockArchive {
    id: number;
    world_x: number; world_y: number;
    x: number; y: number;
    vsp: number; timer: number;
}

//整个世界的信息
interface WorldArchive {
    name: string;
    lastTime: string;
    world: number[][];
    lowest_point: number;
    player: PlayerArchive;
    animals: AnimalArchive[];
    inventory: InventoryArchive;
    chests: ChestAichive[];
    entityBlocks: EntityBlockArchive[];
    skyTimer: number;
}

export { WorldArchive, SaveEntry, AnimalArchive, SlotMessage, ChestAichive, EntityBlockArchive }