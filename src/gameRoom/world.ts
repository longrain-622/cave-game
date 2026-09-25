import { canOver, idOfBlock } from "./nature/blockMecha/blocks.js";

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

export interface BlockState {
    type: number;
    behind: number; // 背后方块的类型 id，air 表示无背景
}
export function newBlockState(type: number, behind: number = idOfBlock.air): BlockState {
    return {
        type: type,
        behind: behind,
    };
}

export const changePos: BlockPos[] = []; // 待处理的方块坐标
export const lightPos: BlockPos[] = []; // 需要计算光照的

// 所有修改 world 数组的操作必须使用该函数
export function setWorldState(pos: BlockPos, state: BlockState): void {
    if (isOutOfBounds(pos.y, pos.x)) {return;}
    const idx: number = registerBlockState(state);
    if (world[pos.y][pos.x] === idx) {return;}
    world[pos.y][pos.x] = idx;

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
    const col: number = Math.floor(x / 64);
    const row: number = Math.floor(y / 64);
    if (isOutOfBounds(row, col)) {return true;} // 越界视为实体（与旧版 canOver(undefined) 一致）
    return !canOver(blockTypeAt(col, row));
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
        if (isOutOfBounds(n.y, n.x) || !canOver(blockTypeAt(n.x, n.y))) {
            flat++;
        }
    }
    return flat === 4;
}

// 读取 (x, y) 处方块的类型 id（世界格存的是调色板索引，运行时经调色板解析）
export function blockTypeAt(x: number, y: number): number {
    if (isOutOfBounds(y, x)) {return -1;}
    return getBlockState(world[y][x]).type;
}

// 越界处按空气处理（只读常量，调用方不得修改）
const airState: BlockState = newBlockState(idOfBlock.air);

// 读取 (x, y) 处的完整方块状态（越界返回空气状态）
export function blockStateAt(x: number, y: number): BlockState {
    if (isOutOfBounds(y, x)) {return airState;}
    return getBlockState(world[y][x]);
}

// 只替换 type、保留原 behind 的新状态：改变方块类型时统一用它，避免背景被清掉
export function stateWithType(x: number, y: number, type: number): BlockState {
    return newBlockState(type, blockStateAt(x, y).behind);
}

export function isOutOfBounds(row: number, col: number): boolean { // y, x
    if (row < 0 || row >= world_height) {return true;}
    const rowLen: number = world[row]?.length ?? 0;
    return col < 0 || col >= rowLen;
}

// 区块数组须已是调色板索引（由生成方负责转换），本函数只做追加
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

// 状态字段的位定义按声明顺序从低位占用
// behind 存方块 id 会有负值，先加 offset 抬到非负区间，否则符号位会串进高位字段
const stateFields: { key: Exclude<keyof BlockState, 'type'>; bits: number; offset: number }[] = [
    { key: 'behind', bits: 8, offset: 128 }, // 背景方块 id，8 位可表示 -128 ~ 127
];

function keyOf(state: BlockState): number {
    let fieldBits: number = 0;
    for (const field of stateFields) { fieldBits += field.bits; }
    let key: number = state.type << fieldBits;
    let shift: number = 0;
    for (const field of stateFields) {
        // 掩码让越界值只在自身字段内回绕，不会污染 type 与相邻字段
        const value: number = (Number(state[field.key]) + field.offset) & ((1 << field.bits) - 1);
        key |= value << shift;
        shift += field.bits;
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

// 旧档的 behind 是布尔值（false = 无背景），统一转成背景方块 id（air 即无背景）
function normalizeBehind(val: number | boolean): number {
    return typeof val === 'boolean' ? idOfBlock.air : val;
}

// 载入存档自带的调色板（每份存档独立一套），索引与存档内的世界格值对齐。
export function loadPalette(states: BlockState[]): void {
    palette.length = 0;
    paletteMap.clear();
    for (let i = 0; i < states.length; i++) {
        // 旧档的状态对象可能缺少后来新增的属性，用当前默认值补齐后入表
        const state: BlockState = Object.assign(newBlockState(states[i].type), states[i]);
        // 旧档没有数字 behind 的信息，布尔值只能还原成"无背景"
        state.behind = normalizeBehind(state.behind as number | boolean);
        palette.push(state);
        paletteMap.set(keyOf(state), i);
    }
}

// 新档开始时清空调色板
export function resetPalette(): void {
    palette.length = 0;
    paletteMap.clear();
}

// 旧存档迁移：世界数组里存的还是方块类型 id，逐格注册基础状态并改写为调色板索引
export function migrateWorldToPalette(): void {
    const idToIndex: Map<number, number> = new Map();
    const toIndex: (id: number) => number = (id: number) => {
        let idx: number | undefined = idToIndex.get(id);
        if (idx === undefined) {
            idx = registerBlockState(newBlockState(id));
            idToIndex.set(id, idx);
        }
        return idx;
    };
    for (const row of world) {
        for (let c = 0; c < row.length; c++) {
            row[c] = toIndex(row[c]);
        }
    }
}
