import { canOver } from "./nature/blockMecha/blocks.js";

// 世界的属性等
export const world_height: number = 256;
export let worldName: string = "New World";
export function setWorldName(val: string): void { worldName = val; }
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
    if (canOver(world[Math.floor(y / 64)][Math.floor(x / 64)])) {return false;}
    else {return true;}
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
        if (isOutOfBounds(n.y, n.x) || !canOver(world[n.y][n.x])) {
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

// 调色板 每个存档独立一套 懒创建
export const palette: BlockState[] = []; // 状态实例数组，数组下标即索引
export const paletteMap = new Map<number, number>(); // 状态编码 - 索引

// 布尔状态维度的位定义按声明顺序从低位占用
const flagBits: { key: Exclude<keyof BlockState, 'type'>; bit: number }[] = [
    { key: 'behind', bit: 1 },
    { key: 'underCave', bit: 2 },
];

function keyOf(state: BlockState): number {
    let key: number = state.type << flagBits.length;
    for (const flag of flagBits) {
        if (state[flag.key]) { key |= flag.bit; }
    }
    return key;
}

/**
 * 已存在则返回已有索引，否则追加到调色板末尾。
 * 索引只增不回收，同一存档内世界格值与调色板始终对齐。
 */
export function registerBlockState(state: BlockState): number {
    const key: number = keyOf(state);
    const existing: number | undefined = paletteMap.get(key);
    if (existing !== undefined) {
        return existing;
    }
    const idx: number = palette.length;
    palette.push(state);
    paletteMap.set(key, idx);
    return idx;
}

// 通过索引获取方块状态（运行时读取使用）
export function getBlockState(index: number): BlockState {
    return palette[index];
}

// 载入存档自带的调色板（每份存档独立一套），索引与存档内的世界格值对齐。
export function loadPalette(states: BlockState[]): void {
    palette.length = 0;
    paletteMap.clear();
    for (let i = 0; i < states.length; i++) {
        palette.push(states[i]);
        paletteMap.set(keyOf(states[i]), i);
    }
}

// 新档开始时清空调色板
export function resetPalette(): void {
    palette.length = 0;
    paletteMap.clear();
}
