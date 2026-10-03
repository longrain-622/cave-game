import { entityBlock_array, newEntityBlock } from "../entityBlock.js";
import { isOutOfBounds, setWorldState, BlockPos, BlockState, stateWithType, blockTypeAt, blockStateAt, newBlockState, getBlockState, world, world_height } from "../../world.js";
import { getRandomInt } from "../../../constants/utils.js";
import { createParticles } from "../../particle.js";
import { createDrop } from "../../dropped/droppedItem.js";
import { idOfBlock, canOver, canWaterFlowInto, blocksWater, WATER_SOURCE, WATER_FLOW_MAX, WATER_FALLING } from "./blocks.js";
import { mouse } from "../../mouse.js";
import { lowest_point } from "../createWorld.js";
import { idOfItem } from "../../dropped/itemIds.js";

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
        const newType: number = blockTypeAt(pos.x, pos.y) === idOfBlock.grass ? idOfBlock.dirt : idOfBlock.grass;
        setWorldState({ x: pos.x, y: pos.y }, stateWithType(pos.x, pos.y, newType));
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
            setWorldState({ x: mouse_x, y: mouse_y }, stateWithType(mouse_x, mouse_y, idOfBlock.oak_door_bottom_open));
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, stateWithType(mouse_x, mouse_y - 1, idOfBlock.oak_door_top_open));
            break;
        case idOfBlock.oak_door_top:
            setWorldState({ x: mouse_x, y: mouse_y }, stateWithType(mouse_x, mouse_y, idOfBlock.oak_door_top_open));
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, stateWithType(mouse_x, mouse_y + 1, idOfBlock.oak_door_bottom_open));
            break;
        case idOfBlock.oak_door_bottom_open:
            setWorldState({ x: mouse_x, y: mouse_y }, stateWithType(mouse_x, mouse_y, idOfBlock.oak_door_bottom));
            setWorldState({ x: mouse_x, y: mouse_y - 1 }, stateWithType(mouse_x, mouse_y - 1, idOfBlock.oak_door_top));
            break;
        case idOfBlock.oak_door_top_open:
            setWorldState({ x: mouse_x, y: mouse_y }, stateWithType(mouse_x, mouse_y, idOfBlock.oak_door_top));
            setWorldState({ x: mouse_x, y: mouse_y + 1 }, stateWithType(mouse_x, mouse_y + 1, idOfBlock.oak_door_bottom));
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

export function torchDrop(looking: number, lookx: number, looky: number): number {
    if (looking === idOfBlock.torch) {
        const tch: BlockState = blockStateAt(lookx, looky);
        switch (tch.direction) {
            case 0:
                if (blockTypeAt(lookx + 1, looky) <= idOfBlock.air) {
                    createDrop(idOfItem.torch, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
                    return idOfBlock.air;
                }
                break;
            case 1:
                if (blockTypeAt(lookx - 1, looky) <= idOfBlock.air) {
                    createDrop(idOfItem.torch, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
                    return idOfBlock.air;
                }
                break;
            case 2:
                if (blockTypeAt(lookx, looky + 1) <= idOfBlock.air && tch.behind === idOfBlock.air) {
                    createDrop(idOfItem.torch, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
                    return idOfBlock.air;
                }
                break;
        }
    }

    return looking;
}

const WATER_TICK_DELTA: number = 6; // 水每积累多少 delta 推进一次（约 0.1 秒，与帧率无关）
const WATER_MAX_PER_TICK: number = 512; // 单次推进的上限
const waterPending: BlockPos[] = []; // 待处理的水格
let waterTickTimer: number = 0;

interface WaterResult {
    strength: number; // -1 表示应当干涸，0 是水源，1~8 是水流
    direction: number;
}

// 水向下游扩散时用的强度
function flowStrength(condition: number): number {
    if (condition === WATER_SOURCE || condition === WATER_FALLING) {return WATER_FLOW_MAX;}
    return condition - 1;
}

function isWaterSource(x: number, y: number): boolean {
    if (blockTypeAt(x, y) !== idOfBlock.water) {return false;}
    return blockStateAt(x, y).condition === WATER_SOURCE;
}

// 写回水格，保留背景层
function writeWater(x: number, y: number, condition: number, direction: number): void {
    setWorldState({ x: x, y: y }, newBlockState(idOfBlock.water, blockStateAt(x, y).behind, direction, condition));
}

// 侧向来源的强度
function sideFeedStrength(x: number, y: number, from_x: number): number {
    const state: BlockState = blockStateAt(from_x, y);
    if (state.type !== idOfBlock.water) {return 0;}
    if (state.condition === WATER_SOURCE || state.condition === WATER_FALLING) {return WATER_FLOW_MAX;}

    // direction 0 is left, 1 is right
    if (state.direction === 1 && from_x < x) {return state.condition - 1;}
    if (state.direction === 0 && from_x > x) {return state.condition - 1;}
    return 0;
}

// 按邻居重算水格自己的状态
function evaluateWater(x: number, y: number, state: BlockState): WaterResult {
    let sources: number = 0;
    if (isWaterSource(x, y - 1)) {sources++;}
    if (isWaterSource(x - 1, y)) {sources++;}
    if (isWaterSource(x + 1, y)) {sources++;}
    if (sources >= 2 && blocksWater(blockTypeAt(x, y + 1))) {
        return { strength: WATER_SOURCE, direction: state.direction };
    }

    const aboveIsWater: boolean = blockTypeAt(x, y - 1) === idOfBlock.water;

    if (aboveIsWater) {
        return { strength: WATER_FALLING, direction: state.direction };
    }

    // 竖直水流
    if (state.condition === WATER_FALLING) {
        return { strength: -1, direction: state.direction };
    }

    // 水平水流
    const fromLeft: number = sideFeedStrength(x, y, x - 1);
    const fromRight: number = sideFeedStrength(x, y, x + 1);
    if (fromLeft > 0 || fromRight > 0) {
        if (fromLeft === fromRight) {return { strength: fromLeft, direction: state.direction };}
        return fromLeft > fromRight
            ? { strength: fromLeft, direction: 1 }
            : { strength: fromRight, direction: 0 };
    }

    if (state.condition <= 1) {
        return { strength: -1, direction: state.direction };
    }
    return { strength: state.condition - 1, direction: state.direction };
}

// 向外扩散，canWaterFlowInto 允许的格子才能进水（火把、杂草等会被冲毁）
function spreadWater(x: number, y: number, condition: number, direction: number): void {
    const below: number = blockTypeAt(x, y + 1);
    if (canWaterFlowInto(below)) {
        writeWater(x, y + 1, WATER_FALLING, 0);
        return;
    }
    if (below === idOfBlock.water && condition !== WATER_SOURCE) {
        const belowIsSource: boolean = blockStateAt(x, y + 1).condition === WATER_SOURCE;
        const selfIsFalling: boolean = condition === WATER_FALLING;
        if (selfIsFalling || belowIsSource) {return;}
    }

    const flow: number = flowStrength(condition);
    if (flow <= 0) {return;}

    if (condition === WATER_SOURCE || condition === WATER_FALLING) {
        if (canWaterFlowInto(blockTypeAt(x - 1, y))) {writeWater(x - 1, y, flow, 0);}
        if (canWaterFlowInto(blockTypeAt(x + 1, y))) {writeWater(x + 1, y, flow, 1);}
        return;
    }

    const nextX: number = direction === 0 ? x - 1 : x + 1;
    if (canWaterFlowInto(blockTypeAt(nextX, y))) {writeWater(nextX, y, flow, direction);}
}

function updateWater(x: number, y: number): boolean { // 返回是否干涸了
    const state: BlockState = blockStateAt(x, y);
    if (state.type !== idOfBlock.water) {return false;} // 陈旧条目：该格已经不是水

    if (state.condition === WATER_SOURCE) {
        spreadWater(x, y, WATER_SOURCE, state.direction);
        return false;
    }

    const result: WaterResult = evaluateWater(x, y, state);
    if (result.strength < 0) { // 干涸
        setWorldState({ x: x, y: y }, stateWithType(x, y, idOfBlock.air));
        return true;
    }
    if (result.strength !== state.condition || result.direction !== state.direction) {
        writeWater(x, y, result.strength, result.direction);
    }
    spreadWater(x, y, result.strength, result.direction);
    return false;
}

export function waterFlow(look_x: number, look_y: number): void { // 被改动的格子若是水，就登记到下一轮重算
    if (blockTypeAt(look_x, look_y) !== idOfBlock.water) {return;}
    waterPending.push({ x: look_x, y: look_y });
}

export function setWaterFlow(delta: number): void { // 每帧调用：积累到量后把这一轮登记的水格全部重算一遍
    waterTickTimer += delta;
    if (waterTickTimer < WATER_TICK_DELTA) {return;}
    waterTickTimer = 0;

    // 干涸会连锁带走相邻的水，同一轮里顺着排下去，否则断源后整片水要一格一格地慢慢消失
    const positions: BlockPos[] = waterPending.splice(0);
    let head: number = 0;
    while (head < positions.length && head < WATER_MAX_PER_TICK) {
        const pos: BlockPos = positions[head++];
        if (isOutOfBounds(pos.y, pos.x)) {continue;}
        if (!updateWater(pos.x, pos.y)) {continue;}
        positions.push({ x: pos.x - 1, y: pos.y }, { x: pos.x + 1, y: pos.y },
            { x: pos.x, y: pos.y - 1 }, { x: pos.x, y: pos.y + 1 });
    }

    // 超出上限的部分留到下一轮
    for (let i: number = head; i < positions.length; i++) {waterPending.push(positions[i]);}
}

// 读档后调用：让存档里没流完的水继续按规则推进（水源不必登记）
export function resumeWaterFlow(): void {
    for (let y = 0; y < world_height; y++) {
        for (let x = 0; x < world[y].length; x++) {
            const state: BlockState | undefined = getBlockState(world[y][x]);
            if (!state || state.type !== idOfBlock.water || state.condition === WATER_SOURCE) {continue;}
            waterPending.push({ x: x, y: y });
        }
    }
}