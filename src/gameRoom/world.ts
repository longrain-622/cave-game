import { canOver, idOfBlock } from "./nature/blockMecha/blocks.js";

// 世界的属性等
export const world_height: number = 256;
export let worldName: string = "New World";
export function setWorldName(val: string): void { worldName = val; }
export const sealevel: number = world_height / 2;

interface Chunk {
    width: number;
    start_x: number;
    num: number;
    lookRange: number; // 渲染范围
    left_number: number; // 左侧区块数量
}
export const chunk: Chunk = { // 定义区块对象
    width: 16,
    start_x: 0,
    num: 0,
    lookRange: 32,
    left_number: 0,
}

export let world: number[][] = Array.from({ length: world_height }, (): number[] => []);
export function loadWorld(theWorld: number[][]): void {
    world = theWorld;
}

export interface BlockPos {
    x: number; y: number;
}

/*
    behind: 背后方块的类型 id，air 表示无背景
    direction: 方向 0左或默认 1右
    condition: 通用的方块附加状态，含义由方块类型决定，默认 0
        水：0 水源、1~7 水平水流（数字越大水量越大）、8 竖直水流；水源与竖直水流不使用 direction
*/
export interface BlockState {
    type: number;
    behind: number;
    direction: number;
    condition: number;
}
export function newBlockState(
    type: number,
    behind: number = idOfBlock.air,
    direction: number = 0,
    condition: number = 0
): BlockState {
    return {
        type: type,
        behind: behind,
        direction: direction,
        condition: condition,
    };
}

export const changePos: BlockPos[] = []; // 待处理的方块坐标
export const lightPos: BlockPos[] = []; // 需要计算光照的

export let onWorldStateChanged: ((pos: BlockPos, index: number) => void) | null = null; // 主机联网时用于收集方块变化；单机/客户端保持 null。
export function setWorldStateListener(listener: ((pos: BlockPos, index: number) => void) | null): void {
    onWorldStateChanged = listener;
}

// 区块生成后通知网络层；纯逻辑层只调用 notifyChunkCreate，由 hostNet 决定是否下发。
// 必须在世界左移的同一帧、其他逻辑改动世界之前触发，否则 diff 会带着平移后的坐标提前下发。
let chunkCreateListener: ((behind: boolean) => void) | null = null;
export function setChunkCreateListener(listener: ((behind: boolean) => void) | null): void {
    chunkCreateListener = listener;
}
export function notifyChunkCreate(behind: boolean): void {
    if (chunkCreateListener !== null) {
        chunkCreateListener(behind);
    }
}

function keepStoneDark(old: BlockState | undefined, next: BlockState): BlockState { // stone_dark 被别的方块占用时退到背景层，格子再变回空气时又从背景层回到前景
    if (
        old && old.type === idOfBlock.stone_dark &&
        next.type !== idOfBlock.stone_dark
    ) {
        return newBlockState(
            next.type,
            idOfBlock.stone_dark,
            next.direction,
            next.condition
        );
    }
    if (next.type === idOfBlock.air &&
        next.behind === idOfBlock.stone_dark
    ) {
        return newBlockState(
            idOfBlock.stone_dark,
            next.behind,
            next.direction,
            next.condition
        );
    }
    return next;
}

export function setWorldState(pos: BlockPos, state: BlockState): void { // 所有修改 world 数组的操作必须使用该函数
    if (isOutOfBounds(pos.y, pos.x)) {return;}
    const next: BlockState = keepStoneDark(getBlockState(world[pos.y][pos.x]), state);
    const idx: number = registerBlockState(next);
    if (world[pos.y][pos.x] === idx) {return;}
    world[pos.y][pos.x] = idx;

    if (onWorldStateChanged !== null) {
        onWorldStateChanged(pos, idx);
    }

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

export function place_meeting(x: number, y: number): boolean { // 检测点与对象的碰撞
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

export function blockTypeAt(x: number, y: number): number { // 读取 (x, y) 处方块的类型 id（世界格存的是调色板索引，运行时经调色板解析）
    if (isOutOfBounds(y, x)) {return -1;}
    return getBlockState(world[y][x]).type;
}

const airState: BlockState = newBlockState(idOfBlock.air); // 越界处按空气处理（只读常量，调用方不得修改）

export function blockStateAt(x: number, y: number): BlockState { // 读取 (x, y) 处的完整方块状态（越界返回空气状态）
    if (isOutOfBounds(y, x)) {return airState;}
    return getBlockState(world[y][x]);
}

export function stateWithType(x: number, y: number, type: number): BlockState { // 只替换 type 的新状态 改变方块类型时统一用它
    const old: BlockState = blockStateAt(x, y);
    const newState: BlockState = newBlockState(type, old.behind, old.direction, old.condition);
    return newState;
}

export function worldXAt(col: number): number { // 该列生成时使用的全局 X 坐标
    return col - chunk.left_number * chunk.width;
}

export function isOutOfBounds(row: number, col: number): boolean { // y, x
    if (row < 0 || row >= world_height) {return true;}
    const rowLen: number = world[row]?.length ?? 0;
    return col < 0 || col >= rowLen;
}

export function pushChunkToWorld(chunkArray: number[][], behind: boolean): void { // 区块数组须已是调色板索引（由生成方负责转换），本函数只做追加
    const expectedLen: number = chunk.num * chunk.width;
    for (let i = 0; i < world_height; i++) {
        if (world[i].length > expectedLen) {
            world[i].length = expectedLen; // 截断污染：如果该行长度超过预期，说明被越界写入过
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

/*
    type 之外的字段一律登记在此，位定义按声明顺序从低位占用
    用 Record 约束键集合：给 BlockState 加字段却忘了登记时，这一行会编译报错，不会静默丢掉字段
    behind 存方块 id 会有负值，先加 offset 抬到非负区间，否则符号位会串进高位字段
    behind: 背景方块 id，8 位可表示 -128 ~ 127
    condition: 附加状态，4 位可表示 0 ~ 15
*/
type StateFieldKey = Exclude<keyof BlockState, 'type'>;
const stateFields: Record<StateFieldKey, { bits: number; offset: number }> = {
    behind: { bits: 8, offset: 128 },
    direction: { bits: 2, offset: 0 },
    condition: { bits: 4, offset: 0 },
};

function keyOf(state: BlockState): number {
    const names: StateFieldKey[] = Object.keys(stateFields) as StateFieldKey[];
    let fieldBits: number = 0;
    for (const name of names) { fieldBits += stateFields[name].bits; }
    let key: number = state.type << fieldBits;
    let shift: number = 0;
    for (const name of names) {
        const field: { bits: number; offset: number } = stateFields[name];
        const value: number = (Number(state[name]) + field.offset) & ((1 << field.bits) - 1); // 掩码让越界值只在自身字段内回绕，不会污染 type 与相邻字段
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

export function getBlockState(index: number): BlockState { // 通过索引获取方块状态（运行时读取使用）
    return palette[index];
}

function normalizeBehind(val: number | boolean): number { // 旧档的 behind 是布尔值，统一转成背景方块 id
    return typeof val === 'boolean' ? idOfBlock.air : val;
}

export function loadPalette(states: BlockState[]): void { // 载入存档自带的调色板（每份存档独立一套），索引与存档内的世界格值对齐。
    palette.length = 0;
    paletteMap.clear();
    for (let i = 0; i < states.length; i++) {
        const state: BlockState = Object.assign(newBlockState(states[i].type), states[i]); // 旧档的状态对象可能缺少后来新增的属性，用当前默认值补齐后入表
        state.behind = normalizeBehind(state.behind as number | boolean); // 旧档没有数字 behind 的信息，布尔值只能还原成"无背景"
        palette.push(state);
        paletteMap.set(keyOf(state), i);
    }
}

export function resetPalette(): void { // 新档开始时清空调色板
    palette.length = 0;
    paletteMap.clear();
}

export function migrateWorldToPalette(): void { // 旧存档迁移：世界数组里存的还是方块类型 id，逐格注册基础状态并改写为调色板索引
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
