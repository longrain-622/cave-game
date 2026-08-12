import { entityBlock_array, newEntityBlock } from "../entityBlock.js";
import { world, isOutOfBounds, setWorldState, BlockPos } from "../../world.js";
import { getRandomInt } from "../../../constants/utils.js";
import { createParticles } from "../../particle.js";
import { createDrop } from "../../dropped/droppedItem.js";
import { idOfBlock } from "./blocks.js";
import { mouse } from "../../mouse.js";
import { lowest_point } from "../createWorld.js";

// 草/泥土延迟变化的待处理方块：坐标 + 剩余帧数
interface DelayPos extends BlockPos {
    time: number;
}
const grassDirtDelay: DelayPos[] = [];
const GRASS_DELAY_FRAMES: number = 256;

// 是否满足草/泥土的变化条件
function shouldChangeGrassDirt(x: number, y: number): boolean {
    if (isOutOfBounds(y, x)) {return false;}

    if (world[y][x] === idOfBlock.grass) { // 草方块的性质：被覆盖时变成泥土
        if (isOutOfBounds(y - 1, x)) {return false;}
        return world[y - 1][x] >= 0;
    }

    if (world[y][x] === idOfBlock.dirt) { // 泥土的性质：旁边是草会长草
        if (isOutOfBounds(y - 1, x) || isOutOfBounds(y, x - 1) || isOutOfBounds(y, x + 1) ||
            isOutOfBounds(y - 1, x - 1) || isOutOfBounds(y - 1, x + 1) ||
            isOutOfBounds(y + 1, x - 1) || isOutOfBounds(y + 1, x + 1)) {
            return false;
        }
        return (world[y][x - 1] === idOfBlock.grass || world[y][x + 1] === idOfBlock.grass ||
            world[y - 1][x - 1] === idOfBlock.grass || world[y - 1][x + 1] === idOfBlock.grass ||
            world[y + 1][x - 1] === idOfBlock.grass || world[y + 1][x + 1] === idOfBlock.grass)
            && world[y - 1][x] === idOfBlock.air;
    }

    return false;
}

export function setGrassDirt(): void { // 每帧调用：草/泥土延迟倒计时，到期后执行变化
    for (let i = grassDirtDelay.length - 1; i >= 0; i--) {
        const pos: DelayPos = grassDirtDelay[i];

        // 方块已不是草/泥土（被挖掉、被替换或世界推移导致坐标失效），取消延迟
        if (isOutOfBounds(pos.y, pos.x) ||
            (world[pos.y][pos.x] !== idOfBlock.grass && world[pos.y][pos.x] !== idOfBlock.dirt)) {
            grassDirtDelay.splice(i, 1);
            continue;
        }

        if (pos.time > 1) {
            pos.time--;
            continue;
        }

        grassDirtDelay.splice(i, 1);
        // 到期后重新验证条件（延迟期间条件可能已变化）
        if (!shouldChangeGrassDirt(pos.x, pos.y)) {continue;}
        setWorldState({ x: pos.x, y: pos.y }, { type: world[pos.y][pos.x] === idOfBlock.grass ? idOfBlock.dirt : idOfBlock.grass });
    }
}

export function grass_and_dirt(looking_block: number, look_x: number, look_y: number): number {
    const index: number = grassDirtDelay.findIndex((pos) => pos.x === look_x && pos.y === look_y);

    if (shouldChangeGrassDirt(look_x, look_y)) {
        if (index === -1) {
            grassDirtDelay.push({ x: look_x, y: look_y, time: GRASS_DELAY_FRAMES }); // 满足变化条件，开始延迟倒计时
        } else {
            grassDirtDelay[index].time = GRASS_DELAY_FRAMES; // 已在表中，刷新倒计时
        }
    } else if (index !== -1) {
        grassDirtDelay.splice(index, 1); // 条件不满足，取消延迟
    }

    return looking_block;
}

export function inviconGrass(looking_block: number, lookx: number, looky: number): number {
    if (looking_block === -3) {
        if (world[looky + 1][lookx] !== 0 && world[looky + 1][lookx] !== 1) {
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-3, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return -1;
        }
    }

    return looking_block;
}

export function sand_gravity(looking_block: number, look_x: number, look_y: number): number {
    if (looking_block === 5 && world[look_y+1][look_x] <= -1) {
        entityBlock_array.push(newEntityBlock(idOfBlock.sand, look_x, look_y));
        if (look_y > lowest_point) {return idOfBlock.stone_dark;}
        else {return idOfBlock.air;}
    }
    return looking_block;
}

export function cactus_and_deadBush(looking_block: number, lookx: number, looky: number): number {
    if (looking_block === -4) {
        if (world[looky + 1][lookx] !== -4 && world[looky + 1][lookx] !== 5) {
            const createX: number = lookx * 64;
            const createY: number = looky * 64;
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-3, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            }
            createDrop(-4, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            return -1;
        }
    } else if (looking_block === -5) {
        if (world[looky + 1][lookx] === -1) {
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-5, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return -1;
        }
    }
    return looking_block;
}

export function door(looking_block: number, lookx: number, looky: number): number {
    if (isOutOfBounds(looky - 1, lookx) || isOutOfBounds(looky + 1, lookx)) {return looking_block;}

    switch (looking_block) {
        case idOfBlock.oak_door_bottom:
            if (world[looky - 1][lookx] !== idOfBlock.oak_door_top) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top:
            if (world[looky + 1][lookx] !== idOfBlock.oak_door_bottom) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_bottom_open:
            if (world[looky - 1][lookx] !== idOfBlock.oak_door_top_open) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top_open:
            if (world[looky + 1][lookx] !== idOfBlock.oak_door_bottom_open) {return idOfBlock.air;}
            break;
    }

    return looking_block;
}

export function door_openOrClose(): void { //run it when mouseup
    const mouse_x: number = mouse.world_x;
    const mouse_y: number = mouse.world_y;

    switch (world[mouse_y][mouse_x]) {
        case idOfBlock.oak_door_bottom:
            setWorldState({ x: mouse_x, y: mouse_y }, { type: idOfBlock.oak_door_bottom_open });
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, { type: idOfBlock.oak_door_top_open });
            break;
        case idOfBlock.oak_door_top:
            setWorldState({ x: mouse_x, y: mouse_y }, { type: idOfBlock.oak_door_top_open });
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, { type: idOfBlock.oak_door_bottom_open });
            break;
        case idOfBlock.oak_door_bottom_open:
            setWorldState({ x: mouse_x, y: mouse_y }, { type: idOfBlock.oak_door_bottom });
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, { type: idOfBlock.oak_door_top });
            break;
        case idOfBlock.oak_door_top_open:
            setWorldState({ x: mouse_x, y: mouse_y }, { type: idOfBlock.oak_door_top });
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, { type: idOfBlock.oak_door_bottom });
            break;
    }
}

export function snowGrass(lookingBlock: number, lookx: number, looky: number): number {
    if (lookingBlock === idOfBlock.snowGrass) {
        if (world[looky - 1][lookx] !== idOfBlock.air) {
            return idOfBlock.dirt;
        } else {
            return lookingBlock;
        }
    }
    return lookingBlock;
}