import { entityBlock_array, newEntityBlock } from "../entityBlock.js";
import { isOutOfBounds, setWorldState, BlockPos, newBlockState, blockTypeAt } from "../../world.js";
import { getRandomInt } from "../../../constants/utils.js";
import { createParticles } from "../../particle.js";
import { createDrop } from "../../dropped/droppedItem.js";
import { idOfBlock, canOver } from "./blocks.js";
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

    if (blockTypeAt(x, y) === idOfBlock.grass) { // 草方块的性质：被覆盖时变成泥土
        if (isOutOfBounds(y - 1, x)) {return false;}
        return !canOver(blockTypeAt(x, y - 1));
    }

    if (blockTypeAt(x, y) === idOfBlock.dirt) { // 泥土的性质：旁边是草会长草
        if (isOutOfBounds(y - 1, x) || isOutOfBounds(y, x - 1) || isOutOfBounds(y, x + 1) ||
            isOutOfBounds(y - 1, x - 1) || isOutOfBounds(y - 1, x + 1) ||
            isOutOfBounds(y + 1, x - 1) || isOutOfBounds(y + 1, x + 1)) {
            return false;
        }
        return (blockTypeAt(x - 1, y) === idOfBlock.grass || blockTypeAt(x + 1, y) === idOfBlock.grass ||
            blockTypeAt(x - 1, y - 1) === idOfBlock.grass || blockTypeAt(x + 1, y - 1) === idOfBlock.grass ||
            blockTypeAt(x - 1, y + 1) === idOfBlock.grass || blockTypeAt(x + 1, y + 1) === idOfBlock.grass)
            && blockTypeAt(x, y - 1) === idOfBlock.air;
    }

    return false;
}

export function setGrassDirt(): void { // 每帧调用：草/泥土延迟倒计时，到期后执行变化
    for (let i = grassDirtDelay.length - 1; i >= 0; i--) {
        const pos: DelayPos = grassDirtDelay[i];

        // 方块已不是草/泥土（被挖掉、被替换或世界推移导致坐标失效），取消延迟
        if (isOutOfBounds(pos.y, pos.x) ||
            (blockTypeAt(pos.x, pos.y) !== idOfBlock.grass && blockTypeAt(pos.x, pos.y) !== idOfBlock.dirt)) {
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
        setWorldState({ x: pos.x, y: pos.y }, newBlockState(blockTypeAt(pos.x, pos.y) === idOfBlock.grass ? idOfBlock.dirt : idOfBlock.grass));
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
    if (looking_block === idOfBlock.invicon_grass) {
        if (blockTypeAt(lookx, looky + 1) !== idOfBlock.glass && blockTypeAt(lookx, looky + 1) !== idOfBlock.dirt) {
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(idOfBlock.invicon_grass, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return -1;
        }
    }

    return looking_block;
}

export function sand_gravity(looking_block: number, look_x: number, look_y: number): number {
    if (looking_block === idOfBlock.sand && canOver(blockTypeAt(look_x, look_y + 1))) {
        entityBlock_array.push(newEntityBlock(idOfBlock.sand, look_x, look_y));
        if (look_y > lowest_point) {return idOfBlock.stone_dark;}
        else {return idOfBlock.air;}
    }
    return looking_block;
}

export function cactus_and_deadBush(looking_block: number, lookx: number, looky: number): number {
    if (looking_block === idOfBlock.cactus) {
        if (blockTypeAt(lookx, looky + 1) !== idOfBlock.cactus && blockTypeAt(lookx, looky + 1) !== idOfBlock.sand) {
            const createX: number = lookx * 64;
            const createY: number = looky * 64;
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-3, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            }
            createDrop(-4, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            return -1;
        }
    } else if (looking_block === idOfBlock.deadBush) {
        if (blockTypeAt(lookx, looky + 1) === idOfBlock.air) {
            for (let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(idOfBlock.deadBush, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return idOfBlock.air;
        }
    }
    return looking_block;
}

export function door(looking_block: number, lookx: number, looky: number): number {
    if (isOutOfBounds(looky - 1, lookx) || isOutOfBounds(looky + 1, lookx)) {return looking_block;}

    switch (looking_block) {
        case idOfBlock.oak_door_bottom:
            if (blockTypeAt(lookx, looky - 1) !== idOfBlock.oak_door_top) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top:
            if (blockTypeAt(lookx, looky + 1) !== idOfBlock.oak_door_bottom) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_bottom_open:
            if (blockTypeAt(lookx, looky - 1) !== idOfBlock.oak_door_top_open) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top_open:
            if (blockTypeAt(lookx, looky + 1) !== idOfBlock.oak_door_bottom_open) {return idOfBlock.air;}
            break;
    }

    return looking_block;
}

export function door_openOrClose(): void { //run it when mouseup
    const mouse_x: number = mouse.world_x;
    const mouse_y: number = mouse.world_y;

    switch (blockTypeAt(mouse_x, mouse_y)) {
        case idOfBlock.oak_door_bottom:
            setWorldState({ x: mouse_x, y: mouse_y }, newBlockState(idOfBlock.oak_door_bottom_open));
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, newBlockState(idOfBlock.oak_door_top_open));
            break;
        case idOfBlock.oak_door_top:
            setWorldState({ x: mouse_x, y: mouse_y }, newBlockState(idOfBlock.oak_door_top_open));
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, newBlockState(idOfBlock.oak_door_bottom_open));
            break;
        case idOfBlock.oak_door_bottom_open:
            setWorldState({ x: mouse_x, y: mouse_y }, newBlockState(idOfBlock.oak_door_bottom));
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, newBlockState(idOfBlock.oak_door_top));
            break;
        case idOfBlock.oak_door_top_open:
            setWorldState({ x: mouse_x, y: mouse_y }, newBlockState(idOfBlock.oak_door_top));
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, newBlockState(idOfBlock.oak_door_bottom));
            break;
    }
}

export function snowGrass(lookingBlock: number, lookx: number, looky: number): number {
    if (lookingBlock === idOfBlock.snowGrass) {
        if (blockTypeAt(lookx, looky - 1) !== idOfBlock.air) {
            return idOfBlock.dirt;
        } else {
            return lookingBlock;
        }
    }
    return lookingBlock;
}