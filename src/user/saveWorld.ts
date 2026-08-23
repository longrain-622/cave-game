import { version } from "../constants/generic.js";
import { getDate } from "../apiox/time.js";
import { worldName, world, chunk } from "../gameRoom/world.js";
import { player } from "../gameRoom/player.js";
import { Animal, animalArray } from "../gameRoom/animals/animalIds.js";
import { inventory } from "../gameRoom/gui/gameGUI/inventory.js";
import { Slots } from "../gameRoom/gui/gameGUI/inventoryConfig.js";
import { Chest, chests } from "../gameRoom/gui/gameGUI/blockGUI/chest.js";
import { Furnace, furnaceArray } from "../gameRoom/gui/gameGUI/blockGUI/furnace.js";
import { entityBlock_array, EntityBlock } from "../gameRoom/nature/entityBlock.js";
import { lowest_point, seed } from "../gameRoom/nature/createWorld.js";
import { clock } from "../gameRoom/nature/sky.js";
import { WorldArchive, SaveEntry, AnimalArchive, SlotMessage, ChestAichive, EntityBlockArchive, FurnaceArchive } from "../types/worldArchive.js";
import localforage from 'localforage';

/*
    key 是存档在存储中的完整键名，通常格式为 "save_<世界名称>"（例如 "save_MyWorld"）。
*/

function checkSameName(worldName: string, existingNames?: Set<string>): string {
    if (existingNames && existingNames.has(worldName)) {
        let counter = 1;
        let newName = worldName + ` - copy (${counter})`;
        while (existingNames.has(newName)) {
            counter++;
            newName = worldName + ` - copy (${counter})`;
        }
        return newName;
    } else {
        return worldName;
    }
}

function saveWorld(cover: boolean, existingNames?: Set<string>): WorldArchive {
    // 防重名机制：如果 worldName 已存在于 existingNames 中，自动添加 " - copy"
    let resolvedName;
    if (cover) {resolvedName = worldName;}
    else {resolvedName = checkSameName(worldName, existingNames);}

    const targetWorld: WorldArchive = {
        version: version,
        name: resolvedName,
        lastTime: '',
        world: world,
        lowest_point: lowest_point,
        left_number: chunk.left_number,
        player: { hp: 20, x: 256, y: 256 },
        animals: [],
        inventory: { items: [] },
        chests: [],
        furnaces: [],
        entityBlocks: [],
        skyTimer: clock.timer,
        seed: seed,
    };

    //保存的时间
    const nowDate = getDate();
    targetWorld.lastTime = `${nowDate.year}/${String(nowDate.month).padStart(2, '0')}/${String(nowDate.day).padStart(2, '0')} ${String(nowDate.hour).padStart(2, '0')}:${String(nowDate.minute).padStart(2, '0')}:${String(nowDate.second).padStart(2, '0')}`;

    //世界数组
    //targetWorld.world = world;

    //玩家信息
    targetWorld.player.hp = player.hp;
    targetWorld.player.x = player.x;
    targetWorld.player.y = player.y;

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

    //存储所有熔炉
    for (let f = 0; f < furnaceArray.length; f++) {
        const targetFurnace: Furnace = furnaceArray[f];
        const saveFurnace: FurnaceArchive = {
            world_x: targetFurnace.world_x,
            world_y: targetFurnace.world_y,
            fuel: {
                item: targetFurnace.fuel.item,
                num: targetFurnace.fuel.num,
                durability: targetFurnace.fuel.durability,
            },
            input: {
                item: targetFurnace.input.item,
                num: targetFurnace.input.num,
                durability: targetFurnace.input.durability,
            },
            output: {
                item: targetFurnace.output.item,
                num: targetFurnace.output.num,
                durability: targetFurnace.output.durability,
            },
            fuelProgress: targetFurnace.fuelProgress,
            outputProgress: targetFurnace.outputProgress,
        };
        targetWorld.furnaces.push(saveFurnace);
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

    /*
    //存储天空计时器
    targetWorld.skyTimer = clock.timer;
    */

    return targetWorld;
}

export async function saveGameToLocal(cover: boolean=false) {
    try {
        // 读取已存在的存档索引，收集所有已用的名字（用于防重名检测）
        let index = await localforage.getItem<SaveEntry[]>('saveIndex') || [];
        const existingNames = new Set(index.map(e => e.name));

        const archive = saveWorld(cover, existingNames);
        const key = 'save_' + (archive.name || 'UnnamedWorld');
        await localforage.setItem(key, archive);

        //更新存档索引
        index = await localforage.getItem<SaveEntry[]>('saveIndex') || [];
        const existingIdx = index.findIndex(e => e.key === key);
        const entry: SaveEntry = { key, name: archive.name, lastTime: archive.lastTime };
        if (existingIdx >= 0) {
            index[existingIdx] = entry;
        } else {
            index.push(entry);
        }
        await localforage.setItem('saveIndex', index);

        console.log('Game save Victory!');
        return true;
    } catch (error) {
        console.error('cannot save your world.', error);
        return false;
    }
}