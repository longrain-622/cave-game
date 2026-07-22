import { getDate } from "../apiox/time.js";
import { worldName, world } from "../gameRoom/const.js";
import { player } from "../gameRoom/player.js";
import { Animal, animalArray } from "../gameRoom/animals/animals.js";
import { inventory } from "../gameRoom/gui/gameGUI/inventory.js";
import { Slots } from "../gameRoom/gui/gameGUI/inventoryConfig.js";
import { Chest, chests } from "../gameRoom/gui/gameGUI/chest.js";
import { entityBlock_array, EntityBlock } from "../gameRoom/nature/entityBlock.js";
import localforage from "localforage.js";

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
    player: PlayerArchive;
    animals: AnimalArchive[];
    inventory: InventoryArchive;
    chests: ChestAichive[];
    entityBlocks: EntityBlockArchive[];
}

export function saveWorld(): WorldArchive {
    const targetWorld: WorldArchive = {
        name: '',
        lastTime: '',
        world: world,
        player: { hp: 20, x: 256, y: 256 },
        animals: [],
        inventory: { items: [] },
        chests: [],
        entityBlocks: [],
    };
    targetWorld.name = worldName;

    //保存的时间
    const nowDate = getDate();
    targetWorld.lastTime = `${nowDate.year}/${String(nowDate.month).padStart(2, '0')}/${String(nowDate.day).padStart(2, '0')} ${String(nowDate.hour).padStart(2, '0')}:${String(nowDate.minute).padStart(2, '0')}:${String(nowDate.second).padStart(2, '0')}`;

    //世界数组
    //targetWorld.world = world;

    //玩家信息
    targetWorld.player.hp = player.hp;
    targetWorld.player.x = player.y;
    targetWorld.player.x = player.x;

    //动物信息
    for (let i = 0; i < animalArray.length; i++) {
        const targetAnimal: Animal = animalArray[i];
        const saveAnimal: AnimalArchive = {
            type: targetAnimal.type,
            hp: targetAnimal.hp,
            x: targetAnimal.x,
            y: targetAnimal.y,
        };
        targetWorld.animals.push(saveAnimal);
    }

    //存储背包
    for (let k = 0; k < inventory.items.length; k++) {
        const targetSlot: Slots = inventory.items[k];
        const saveSlot: SlotMessage = {
            item: targetSlot.item,
            num: targetSlot.num,
            durability: targetSlot.durability,
        };
        targetWorld.inventory.items.push(saveSlot);
    }

    //存储所有箱子
    for (let c = 0; c < chests.length; c++) {
        const targetChest: Chest = chests[c];
        let saveChestFold: SlotMessage[] = [];

        for (let n = 0; n < targetChest.fold.length; n++) {
            const targetSlot: Slots = targetChest.fold[n];
            const saveSlot: SlotMessage = {
                item: targetSlot.item,
                num: targetSlot.num,
                durability: targetSlot.durability,
            };
            saveChestFold.push(saveSlot);
        }

        const saveChest: ChestAichive = {
            world_x: targetChest.world_x,
            world_y: targetChest.world_y,
            fold: saveChestFold,
        };

        targetWorld.chests.push(saveChest);
    }

    //存储所有实体方块
    for (let a = 0; a < entityBlock_array.length; a++) {
        const targetEntityBlock: EntityBlock = entityBlock_array[a];
        const saveEntityBlock: EntityBlockArchive = {
            id: targetEntityBlock.id,
            world_x: targetEntityBlock.world_x, world_y: targetEntityBlock.world_y,
            x: targetEntityBlock.x, y: targetEntityBlock.y,
            vsp: targetEntityBlock.vsp, timer: targetEntityBlock.timer,
        };
        targetWorld.entityBlocks.push(saveEntityBlock);
    }

    return targetWorld;
}

export async function saveGameToLocal() {
    try {
        const archive = saveWorld();
        await localforage.setItem('latestSave', archive);
        console.log('Game save Victory!');
        return true;
    } catch (error) {
        console.error('cannot save your world.', error);
        return false;
    }
}

export async function loadGameFromLocal(): Promise<WorldArchive | null> {
    try {
        const archive = await localforage.getItem<WorldArchive>('latestSave');
        return archive;
    } catch (error) {
        console.error('cannot read your world!', error);
        return null;
    }
}