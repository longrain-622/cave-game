import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { world, blockTypeAt } from '../world.js';
import { getRandomInt, point_coll_rect } from '../const.js';
import { readingWorld, coverWhenSave } from '../gameState.js';
import { WorldArchive, FurnaceArchive } from '../../types/worldArchive.js';
import { player } from '../player.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { createDrop } from '../dropped/droppedItem.js';
import { notNullUndefined } from '../../constants/utils.js';
import { getFurnaceRecipe, FurnaceRecipe, fuels } from '../gui/gameGUI/blockGUI/furnaceRecipe.js';

export interface Furnace {
    world_x: number; world_y: number;
    fuel: Slots;
    input: Slots;
    output: Slots;
    fuelProgress: number; // 燃料燃烧的进度
    outputProgress: number;
}
export const furnaceArray: Furnace[] = [];
const lookRange: number = 32 * 64; // 最大处理距离，超过此值的实例跳过，单位：px

// 加载存档中的所有熔炉
function loadFurnace(readWorld: WorldArchive | null): void {
    if (!(coverWhenSave && notNullUndefined(readWorld))) {return;}
    if (!notNullUndefined(readWorld.furnaces)) {
        console.log('cannot load the furnaces of your world!');
        return;
    }

    for (let f = 0; f < readWorld.furnaces.length; f++) {
        const readFurnace: FurnaceArchive = readWorld.furnaces[f];
        const input = new Slots(readFurnace.input.item, readFurnace.input.num, readFurnace.input.durability);
        const output = new Slots(readFurnace.output.item, readFurnace.output.num, readFurnace.output.durability);
        const fuel = new Slots(readFurnace.fuel.item, readFurnace.fuel.num, readFurnace.fuel.durability);

        const addFurnace: Furnace = {
            world_x: readFurnace.world_x, world_y: readFurnace.world_y,
            fuel: fuel,
            input: input,
            output: output,
            fuelProgress: readFurnace.fuelProgress,
            outputProgress: readFurnace.outputProgress,
        };

        furnaceArray.push(addFurnace);
    }
}

export function lookFurnace(look_x: number, look_y: number): Furnace {
    for (let i = furnaceArray.length - 1; i >= 0; i--) {
        const fur: Furnace = furnaceArray[i];
        if (!world[fur.world_y] || blockTypeAt(fur.world_x, fur.world_y) !== idOfBlock.furnace) {
            furnaceArray.splice(i, 1); // 清除无用的熔炉对象
        }
    }

    // 查找或补漏某个位置的熔炉对象
    let existing = furnaceArray.find(f => f.world_x === look_x && f.world_y === look_y);
    if (!existing) {
        existing = {
            world_x: look_x,
            world_y: look_y,
            input: new Slots(-1, 0),
            output: new Slots(-1, 0),
            fuel: new Slots(-1, 0),
            fuelProgress: 0,
            outputProgress: 0,
        };
        furnaceArray.push(existing);
    }
    return existing;
}

// 烧制物品
// 当有熔炉处于正在使用的状态时，每帧执行一次
function firingItem(whichFurnace: Furnace, delta: number): void {
    const recipe: FurnaceRecipe | undefined = getFurnaceRecipe(whichFurnace.input.item);
    if (!recipe) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
        return;
    }

    if (whichFurnace.output.item !== idOfBlock.air) {
        if (whichFurnace.output.item !== recipe.output) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
            return;
        }
        if (whichFurnace.output.num >= whichFurnace.output.max) {
            whichFurnace.outputProgress = 0;
            if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
            return;
        }
    }

    if (!fuels.includes(whichFurnace.fuel.item)) {
        whichFurnace.outputProgress = 0;
        if (whichFurnace.fuelProgress > 0) {whichFurnace.fuelProgress -= delta;}
        return;
    }

    whichFurnace.outputProgress += delta;
    whichFurnace.fuelProgress += delta;

    if (whichFurnace.outputProgress >= recipe.time) {
        whichFurnace.input.num--;
        if (whichFurnace.input.num <= 0) {
            whichFurnace.input.item = idOfBlock.air;
            whichFurnace.input.num = 0;
        }

        if (whichFurnace.output.item === -1) {
            whichFurnace.output.item = recipe.output;
            whichFurnace.output.num = 1;
            whichFurnace.output.durability = -1;
        } else {
            whichFurnace.output.num++;
        }
        whichFurnace.outputProgress = 0;
    }

    if (whichFurnace.fuelProgress >= 512) {
        whichFurnace.fuelProgress = 0;
        whichFurnace.fuel.num--;

        if (whichFurnace.fuel.num <= 0) {
            whichFurnace.fuel.item = idOfBlock.air;
            whichFurnace.fuel.num = 0;
        }
    }
}

// 每帧处理所有熔炉的烧制
export function furnaceLoop(delta: number): void {
    for (let i = 0; i < furnaceArray.length; i++) {
        if (
            !point_coll_rect(
                furnaceArray[i].world_x * 64,
                furnaceArray[i].world_y * 64,
                player.x - lookRange / 2,
                player.y - lookRange / 2,
                lookRange, lookRange
            )
        ) {
            continue; // 超出玩家视野范围的熔炉跳过，继续处理其余熔炉
        }
        firingItem(furnaceArray[i], delta);
    }
}

// 移除熔炉并把内容物掉落到世界中
export function removeFurnaceAt(furnace_world_x: number, furnace_world_y: number): void {
    if (blockTypeAt(furnace_world_x, furnace_world_y) !== idOfBlock.furnace || furnaceArray.length === 0) {return;}

    const target: Furnace | undefined = furnaceArray.find(
        obj => (obj.world_x === furnace_world_x && obj.world_y === furnace_world_y)
    );
    if (!target) {return;}
    furnaceArray.splice(furnaceArray.indexOf(target), 1);

    const allSlots: Slots[] = [target.input, target.output, target.fuel];
    for (let i = 0; i < allSlots.length; i++) {
        if (allSlots[i].item === -1) {continue;}
        for (let k = 0; k < allSlots[i].num; k++) {
            createDrop(
                allSlots[i].item,
                furnace_world_x * 64 + getRandomInt(0, 64),
                furnace_world_y * 64 + getRandomInt(0, 64)
            );
        }
    }
}

loadFurnace(readingWorld);
