// 世界的属性等
import { idOfBlock } from './nature/blockMecha/blocks.js';

export const world_height: number = 256;
export let worldName: string = "New World";
export function setWorldName(val: string) { worldName = val; }
export const sealevel: number = world_height / 2;

// 定义区块对象
export interface Chunk {
    width: number;
    start_x: number;
    num: number;
    lookRange: number;
    left_number: number;
}
export const chunk: Chunk = {
    width: 16, start_x: 0,
    num: 0, lookRange: 32, // 渲染范围
    left_number: 0, // 左侧区块数量
}

export let world: number[][] = Array.from({ length: world_height }, (): number[] => []);
export function loadWorld(theWorld: number[][]): void {
    world = theWorld;
}

export interface BlockPos {
    x: number; y: number;
}

interface BlockState {
    type: number;
    behind: boolean;
    underCave: boolean;
}
export function newBlockState(type: number): BlockState {
    return {
        type: type,
        behind: false,
        underCave: false,
    };
}

export const changePos: BlockPos[] = []; // 待处理的方块坐标
export const lightPos: BlockPos[] = []; // 需要计算光照的

// 所有修改 world 数组的操作必须使用该函数
export function setWorldState(pos: BlockPos, state: BlockState): void {
    if (isOutOfBounds(pos.y, pos.x)) {return;}
    if (world[pos.y][pos.x] === state.type) {return;}
    world[pos.y][pos.x] = state.type;

    // 因为世界改变，所以加入待处理的方块
    changePos.push(pos);
    changePos.push({ x: pos.x - 1, y: pos.y });
    changePos.push({ x: pos.x + 1, y: pos.y });
    changePos.push({ x: pos.x, y: pos.y - 1 });
    changePos.push({ x: pos.x, y: pos.y + 1 });

    lightPos.push(pos);
    lightPos.push({ x: pos.x - 1, y: pos.y });
    lightPos.push({ x: pos.x + 1, y: pos.y });
    lightPos.push({ x: pos.x, y: pos.y - 1 });
    lightPos.push({ x: pos.x, y: pos.y + 1 });
}

// 检测点与对象的碰撞
export function place_meeting(x: number, y: number): boolean {
    if (world[Math.floor(y / 64)][Math.floor(x / 64)] >= 0) {return true;}
    else {return false;}
}

export function isBlockFold(pos: BlockPos): boolean {
    if (isOutOfBounds(pos.y, pos.x)) {return true;}
    let flat: number = 0;
    const neighbors: BlockPos[] = [
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x, y: pos.y - 1 },
        { x: pos.x + 1, y: pos.y },
        { x: pos.x - 1, y: pos.y },
    ];
    for (const n of neighbors) {
        if (isOutOfBounds(n.y, n.x) || world[n.y][n.x] >= 0) {
            flat++;
        }
    }
    return flat === 4;
}

export function isOutOfBounds(row: number, col: number): boolean { // y, x
    if (row < 0 || row >= world_height) {return true;}
    const rowLen: number = world[row]?.length ?? 0;
    return col < 0 || col >= rowLen;
}

export function pushChunkToWorld(chunkArray: number[][], behind: boolean): void {
    const expectedLen: number = chunk.num * chunk.width;
    for (let i = 0; i < world_height; i++) {
        // 截断污染：如果该行长度超过预期，说明被越界写入过
        if (world[i].length > expectedLen) {
            world[i].length = expectedLen;
        }

        if (behind) {
            world[i].push(...chunkArray[i]);
        } else {
            world[i].unshift(...chunkArray[i]);
        }
    }
}

// 调色板：穷举 每种方块 × 所有状态组合，每种方块占用连续 stateCount 个槽位。
// 状态维度在 stateDims 中声明（字段名 → 全部取值），组合数、索引编码、穷举
// 遍历全部自动派生
const palette: BlockState[] = [];

// 状态维度声明
const stateDims: { key: Exclude<keyof BlockState, 'type'>; values: (boolean | number)[] }[] = [
    { key: 'behind', values: [false, true] },
    { key: 'underCave', values: [false, true] },
];

// 每种方块的状态组合数 = 各维度取值数之积
const stateCount: number = stateDims.reduce((acc, dim) => acc * dim.values.length, 1);

// 枚举取全部方块类型 id
const blockTypeIds: number[] = Object.values(idOfBlock).filter((v): v is number => typeof v === 'number');
const TYPE_OFFSET: number = -Math.min(...blockTypeIds);

// 状态组合-类型槽位内的偏移
function stateIndex(state: BlockState): number {
    let index: number = 0;
    let stride: number = 1;
    for (const dim of stateDims) {
        const pos: number = dim.values.indexOf(state[dim.key]);
        index += (pos < 0 ? 0 : pos) * stride;
        stride *= dim.values.length;
    }
    return index;
}

// 按状态码 s 组装完整 BlockState
// 动态键赋值 TS 无法静态校验，先按 Record 组装再断言
function buildState(type: number, s: number): BlockState {
    const state: Record<string, boolean | number> = { type };
    let code: number = s;
    for (const dim of stateDims) {
        state[dim.key] = dim.values[code % dim.values.length];
        code = Math.floor(code / dim.values.length);
    }
    return state as unknown as BlockState;
}

function initPalette(): void {
    for (const type of blockTypeIds) {
        for (let s = 0; s < stateCount; s++) {
            const state: BlockState = buildState(type, s);
            palette[(type + TYPE_OFFSET) * stateCount + stateIndex(state)] = state;
        }
    }
}

function main(): void {
    initPalette();
}
main();

