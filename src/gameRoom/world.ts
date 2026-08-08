// 世界的属性等
const world_height: number = 256;
let worldName: string = "New World";
function setWorldName(val: string) { worldName = val; }
const sealevel: number = world_height / 2;

// 定义区块对象
interface Chunk {
    width: number;
    start_x: number;
    num: number;
    lookRange: number;
    left_number: number;
}

const chunk: Chunk = {
    width: 16, start_x: 0,
    num: 0, lookRange: 32, // 渲染范围
    left_number: 0, // 左侧区块数量
}

let world: number[][] = Array.from({ length: world_height }, (): number[] => []);

function loadWorld(theWorld: number[][]): void {
    world = theWorld;
}

interface BlockPos {
    x: number; y: number;
}

interface BlockState {
    type: number;
}

// 待处理的方块坐标（由 blockMechanism.ts 的 lookBlocks 处理）
let changePos: BlockPos[] = [];

// 所有修改 world 数组的操作必须使用该函数
function setWorldState(pos: BlockPos, state: BlockState): void {
    if (isOutOfBounds(pos.y, pos.x)) {return;}
    if (world[pos.y][pos.x] === state.type) {return;}
    world[pos.y][pos.x] = state.type;

    // 因为世界改变，所以加入待处理的方块
    changePos.push(pos);
    changePos.push({ x: pos.x - 1, y: pos.y });
    changePos.push({ x: pos.x + 1, y: pos.y });
    changePos.push({ x: pos.x, y: pos.y - 1 });
    changePos.push({ x: pos.x, y: pos.y + 1 });
}

// 检测点与对象的碰撞
function place_meeting(x: number, y: number): boolean {
    if (world[Math.floor(y / 64)][Math.floor(x / 64)] >= 0) {return true;}
    else {return false;}
}

function isOutOfBounds(row: number, col: number): boolean { // y, x
    if (row < 0 || row >= world_height) {return true;}
    const rowLen: number = world[row]?.length ?? 0;
    return col < 0 || col >= rowLen;
}

function pushChunkToWorld(chunkArray: number[][], behind: boolean): void {
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

export {
    world_height,
    worldName,
    setWorldName,
    Chunk,
    chunk,
    world,
    loadWorld,
    setWorldState,
    BlockPos,
    changePos,
    sealevel,
    place_meeting,
    isOutOfBounds,
    pushChunkToWorld
};
