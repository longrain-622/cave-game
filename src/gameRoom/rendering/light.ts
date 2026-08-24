import { isAlphaBlock } from '../nature/blockMecha/blocks.js';
import { room } from '../../constants/generic.js';
import { world, world_height, lightPos, isOutOfBounds, BlockPos, blockTypeAt } from '../world.js';
import { player } from '../player.js';
import { app } from './rendering.js';
import * as PIXI from 'pixi.js';

const maxLight: number = 15; // 满亮度
let lightMap: number[][] = []; // 光照地图

// 每列第一个实心方块的 y
let heightMap: number[] = [];
let heightRound: number[] = [];
let round: number = 0;

// 世界引用
let cachedWorld: number[][] | null = null;

// 世界重新加载或尺寸变化时全量重算光照
function ensureLightMap(): void {
    if (world !== cachedWorld) {fullComputeLightMap(); return;}
    if (lightMap.length !== world_height) {fullComputeLightMap(); return;}
    if ((lightMap[0]?.length ?? 0) !== (world[0]?.length ?? 0)) {fullComputeLightMap();}
}

/*
    光照机制（正式设计）：
    1. 空气光照：只从天空或相邻空气获取（calcLight），实心方块完全遮挡，不参与传播。
    2. 岩石显示亮度：只接收四周邻居的光（calcDisplayLight），用于渲染岩石的明暗渐变，但从不反馈给空气。
    两套系统单向耦合：因此封闭洞穴内部恒为黑暗（无光源时），洞穴明暗由开口位置决定。
*/

// 读空气光照：实心方块一律视为 0（完全遮挡，不参与空气传播）
function readAirLight(lx: number, ly: number): number {
    if (isOutOfBounds(ly, lx)) {return 0;}
    if (!isAlphaBlock(blockTypeAt(lx, ly))) {return 0;}
    return lightMap[ly][lx] ?? 0;
}

function computeColumnHeight(x: number): number {
    for (let i = 0; i < world_height; i++) {
        if (!isAlphaBlock(blockTypeAt(x, i))) {return i;}
    }
    return -1;
}

function getColumnHeight(x: number): number {
    if (x < 0 || x >= heightMap.length) {return -1;}
    if (heightRound[x] !== round) {
        heightMap[x] = computeColumnHeight(x);
        heightRound[x] = round;
    }
    return heightMap[x];
}

// 检测遮挡
function hasSkyAccess(lx: number, ly: number): boolean {
    const top: number = getColumnHeight(lx);
    return top === -1 || ly < top;
}

// 一个格子的空气亮度：看到天空则满亮度，否则 = 透明邻居最大亮度 - 1
function calcLight(lx: number, ly: number): number {
    if (hasSkyAccess(lx, ly)) {return maxLight;}
    let light: number = readAirLight(lx, ly - 1);
    light = Math.max(light, readAirLight(lx, ly + 1));
    light = Math.max(light, readAirLight(lx - 1, ly));
    light = Math.max(light, readAirLight(lx + 1, ly));
    return Math.max(light - 1, 0);
}

// 读任意格子的亮度（空气光或岩石显示值）：供岩石接收光使用
function readDisplayLight(lx: number, ly: number): number {
    if (isOutOfBounds(ly, lx)) {return 0;}
    return lightMap[ly][lx] ?? 0;
}

// 岩石显示亮度 = 四周邻居亮度最大值 - 1：只接收光、不向空气反馈，
// 因此洞口附近的岩壁随深度渐变可见，封闭洞穴内部保持黑暗
function calcDisplayLight(lx: number, ly: number): number {
    let light: number = 0;
    light = Math.max(light, readDisplayLight(lx, ly - 1));
    light = Math.max(light, readDisplayLight(lx, ly + 1));
    light = Math.max(light, readDisplayLight(lx - 1, ly));
    light = Math.max(light, readDisplayLight(lx + 1, ly));
    return Math.max(light - 1, 0);
}

// 逐格处理队列
function propagate(queue: BlockPos[]): void {
    let head: number = 0;
    while (head < queue.length) {
        const cur: BlockPos = queue[head++];
        if (isOutOfBounds(cur.y, cur.x)) {continue;}

        const newLight: number = isAlphaBlock(blockTypeAt(cur.x, cur.y))
            ? calcLight(cur.x, cur.y)
            : calcDisplayLight(cur.x, cur.y);
        if (newLight === lightMap[cur.y][cur.x]) {continue;}
        lightMap[cur.y][cur.x] = newLight;

        queue.push({ x: cur.x, y: cur.y + 1 });
        queue.push({ x: cur.x, y: cur.y - 1 });
        queue.push({ x: cur.x + 1, y: cur.y });
        queue.push({ x: cur.x - 1, y: cur.y });
    }
}

// 全量重算
function fullComputeLightMap(): void {
    cachedWorld = world;
    lightPos.length = 0; // 旧队列中的位置已包含在全量计算里

    const width: number = world[0]?.length ?? 0;
    lightMap = Array.from({ length: world_height }, (): number[] => new Array(width).fill(0));

    heightMap = new Array(width).fill(-1);
    for (let x = 0; x < width; x++) {
        heightMap[x] = computeColumnHeight(x);
    }
    heightRound = new Array(width).fill(0);
    round = 0;

    const queue: BlockPos[] = [];
    for (let y = 0; y < world_height; y++) {
        for (let x = 0; x < width; x++) {
            if (isAlphaBlock(blockTypeAt(x, y)) && hasSkyAccess(x, y)) {
                lightMap[y][x] = maxLight;
                queue.push({ x: x, y: y + 1 });
                queue.push({ x: x, y: y - 1 });
                queue.push({ x: x + 1, y: y });
                queue.push({ x: x - 1, y: y });
            }
        }
    }
    propagate(queue);
}

// 处理队列
function processLightPos(): void {
    ensureLightMap();
    if (lightPos.length === 0) {return;}
    round++;
    propagate(lightPos);
    lightPos.length = 0;
}

function getLight(lx: number, ly: number): number {
    ensureLightMap();
    if (lightPos.length > 0) {processLightPos();}
    if (isOutOfBounds(ly, lx)) {return 0;}
    return lightMap[ly][lx] ?? 0;
}

// 完全黑暗时的最大遮罩不透明度
const maxDarkness: number = 0.8;

// 遮罩层
let lightContainer: PIXI.Container | null = null;
let lightGraphics: PIXI.Graphics[] = [];

function initLightGraphics(): void {
    if (!app || lightContainer) {return;}

    lightContainer = new PIXI.Container();
    app.stage.addChild(lightContainer);
    lightContainer.zIndex = 3.7; // 玩家和动物之上、鼠标等 UI 之下

    // 预估最大可见方块数
    const maxTilesX: number = Math.ceil(room.width / 64) + 2;
    const maxTilesY: number = Math.ceil(room.height / 64) + 2;
    const maxVisibleTiles: number = maxTilesX * maxTilesY;

    // Graphics 池
    for (let i: number = 0; i < maxVisibleTiles; i++) {
        const light = new PIXI.Graphics();
        light.beginFill(0x000000, 1); // 黑色填充，明暗由每帧的 alpha 控制
        light.drawRect(0, 0, 64, 64);
        light.visible = false;
        lightContainer.addChild(light);
        lightGraphics.push(light);
    }
}

// 惰性初始化（与 rendering.ts 互相导入，main 中直接访问 app 会因 TDZ 报错）
// 由 updateLightPixi 首次调用时完成
export function updateLightPixi(): void {
    if (!lightContainer) {initLightGraphics();}

    const startRow: number = Math.floor(player.y / 64) - Math.floor(room.height / 128);
    const startCol: number = Math.floor(player.x / 64) - Math.floor(room.width / 128);
    const rowsToDraw: number = Math.ceil(room.height / 64) + 2;
    const colsToDraw: number = Math.ceil(room.width / 64) + 2;

    let index: number = 0; // 池索引

    for (let k = 0; k < rowsToDraw; k++) {
        const worldRow: number = startRow + k;
        const draw_y: number = worldRow * 64 - player.y + player.screen_y;

        for (let i = 0; i < colsToDraw; i++) {
            const worldCol: number = startCol + i;
            const draw_x: number = worldCol * 64 - player.x + player.screen_x;
            const light: PIXI.Graphics = lightGraphics[index];
            if (!light) {break;}

            if (isOutOfBounds(worldRow, worldCol) || isOutOfBounds(worldRow, 0)) {
                light.visible = false;
                index++;
                continue;
            }

            const darkness: number = 1 - getLight(worldCol, worldRow) / maxLight;
            if (darkness <= 0) {
                light.visible = false;
            } else {
                light.position.set(draw_x, draw_y);
                light.alpha = darkness * maxDarkness;
                light.visible = true;
            }

            index++;
        }
    }

    // 隐藏池中剩余的
    for (let i: number = index; i < lightGraphics.length; i++) {
        lightGraphics[i].visible = false;
    }
}

export { getLight, maxLight };