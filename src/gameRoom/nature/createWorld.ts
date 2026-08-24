import { world_height, pushChunkToWorld, chunk, loadWorld, sealevel, loadPalette, resetPalette, migrateWorldToPalette, getBlockState, registerBlockState, newBlockState } from "../world.js";
import { getRandomInt } from "../const.js";
import { player } from "../player.js";
import { eventBus } from "../others/eventBus.js";
import { idOfBlock } from "./blockMecha/blocks.js";
import { readingWorld, coverWhenSave } from "../gameState.js";
import { notNullUndefined } from "../../constants/utils.js";

// 温度类型常量
const TEMP = {
    HOT: 1, NORMAL: 0, COLD: -1,
    NOISE_SCALE: 0.008, // 温度变化频率（越小越平缓，形成较大气候带）
    OCTAVES: 3, // 分形层数
    PERSISTENCE: 0.5,
    LACUNARITY: 2.0,
    // 温度阈值（使常温区域占比约 60%）
    HOT_THRESHOLD: 0.25, // >为HOT
    COLD_THRESHOLD: -0.25, // <为COLD
}

let lowest_point: number = 0; //地形最低点的纵坐标

//佩林噪声
class PerlinNoise {
    seed: number; gradient: number;
    random: () => number;

    constructor(seed = Math.random()) {
        this.seed = seed;
        this.gradient = null; // 梯度表，实际一维噪声用随机值即可
        this.init();
    }

    // 初始化随机梯度
    init() {
        // 使用种子生成一个随机数序列
        let r = (this.seed * 43758.5453) % 1;
        this.random = () => {
            r = (r * 43758.5453) % 1;
            return r;
        };
    }

    // 线性插值
    lerp(a: number, b: number, t: number) {
        return a + t * (b - a);
    }

    // 平滑函数
    fade(t: number) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // 一维佩林噪声，输入 x，输出范围约 [-1, 1]
    noise(x: number) {
        // 确定所在格子
        let x0 = Math.floor(x);
        let x1 = x0 + 1;
        // 格子内相对位置
        let tx = x - x0;
        // 平滑曲线
        let u = this.fade(tx);

        // 生成格子角点的随机梯度（这里用随机值代替梯度方向，简单实现）
        let v0 = this.randomGradient(x0);
        let v1 = this.randomGradient(x1);

        // 插值
        return this.lerp(v0, v1, u);
    }

    // 根据整数坐标生成随机梯度（-1 到 1 之间的随机数）
    randomGradient(i: number) {
        // 使用正弦和乘法生成伪随机数，保证相同 i 得到相同值
        let val = Math.sin(i * 12.9898 + this.seed * 43758.5453) * 43758.5453;
        return (val - Math.floor(val)) * 2 - 1; // 映射到 [-1, 1]
    }

    // 分形噪声（叠加多个频率）
    fbm(x: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxAmp = 0;
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency) * amplitude;
            maxAmp += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value / maxAmp; // 归一化到约 [-1, 1]
    }

    // 二维噪声核心
    private dotGridGradient(ix: number, iy: number, x: number, y: number): number {
        // 使用哈希函数生成伪随机梯度方向（取四个方向之一或连续角度）
        let angle = Math.sin(ix * 12.9898 + iy * 78.233 + this.seed * 43758.5453) * 43758.5453;
        angle = angle - Math.floor(angle); // [0,1)
        angle = angle * 2 * Math.PI;        // 0 到 2PI
        const gx = Math.cos(angle);
        const gy = Math.sin(angle);
        const dx = x - ix;
        const dy = y - iy;
        return dx * gx + dy * gy;
    }

    // 二维佩林噪声，输入 (x, y)，输出范围约 [-1, 1]
    noise2D(x: number, y: number): number {
        // 整数格子坐标
        let x0 = Math.floor(x);
        let x1 = x0 + 1;
        let y0 = Math.floor(y);
        let y1 = y0 + 1;

        // 局部偏移 (0..1)
        let tx = x - x0;
        let ty = y - y0;

        // 平滑曲线
        let u = this.fade(tx);
        let v = this.fade(ty);

        // 四个角点的梯度贡献
        let n00 = this.dotGridGradient(x0, y0, x, y);
        let n10 = this.dotGridGradient(x1, y0, x, y);
        let n01 = this.dotGridGradient(x0, y1, x, y);
        let n11 = this.dotGridGradient(x1, y1, x, y);

        // 插值
        let nx0 = this.lerp(n00, n10, u);
        let nx1 = this.lerp(n01, n11, u);
        return this.lerp(nx0, nx1, v);
    }

    // 二维分形噪声（FBM）
    fbm2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxAmp = 0;
        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxAmp += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value / maxAmp; // 范围约 [-1, 1]
    }
}

// 创建噪声对象 — 读档时使用存档中的种子，保证新生成区块与已存档区块连续
const seed = (coverWhenSave && notNullUndefined(readingWorld) && notNullUndefined(readingWorld.seed) && !Number.isNaN(readingWorld.seed)) ? readingWorld.seed : Math.random();
const terrainNoise = new PerlinNoise(seed);
const stoneNoise = new PerlinNoise(seed + 1); // 不同种子
const temperatureNoise = new PerlinNoise(seed + 2); // 温度噪声，不同种子

const caveNoise2D = new PerlinNoise(seed + 3); // 专门用于洞穴的二维噪声
const ironNoise2D = new PerlinNoise(seed + 4);
const coalNoise2D = new PerlinNoise(seed + 5);
const andesiteNoise2D = new PerlinNoise(seed + 6); // 安山岩
const dioriteNoise2D = new PerlinNoise(seed + 7); // 闪长岩
const graniteNoise2D = new PerlinNoise(seed + 8); // 花岗岩

/** 根据 X 坐标和温度噪声实例获取温度类型 */
function getTemperatureFromNoise(x: number, tempNoise: PerlinNoise): number {
    // 获取噪声值（范围 -1 到 1）
    let noiseVal: number = tempNoise.fbm(x * TEMP.NOISE_SCALE, TEMP.OCTAVES, TEMP.PERSISTENCE, TEMP.LACUNARITY);
    // 映射到温度类型
    if (noiseVal > TEMP.HOT_THRESHOLD) {
        return TEMP.HOT;
    } else if (noiseVal < TEMP.COLD_THRESHOLD) {
        return TEMP.COLD;
    } else {
        return TEMP.NORMAL;
    }
}

// 读取临时区块数组的方块类型 id
function typeOf(worlding: number[][], x: number, y: number): number {
    return getBlockState(worlding[y][x]).type;
}

function createChunk(startX: number, behind: boolean) { // startX:当前区块在世界中的起始 X 坐标
    let worlding: number[][] = [];
    const sealevel: number = Math.round(world_height / 2);

    // 方块类型 id → 调色板索引；同一区块内缓存，避免重复注册
    const indexOf: Map<number, number> = new Map();
    const toIndex: (id: number) => number = (id: number) => {
        let idx: number | undefined = indexOf.get(id);
        if (idx === undefined) {
            idx = registerBlockState(newBlockState(id));
            indexOf.set(id, idx);
        }
        return idx;
    };

    // 基于全局X温度预生成
    let tempTypes: number[] = new Array(chunk.width);
    for (let x = 0; x < chunk.width; x++) {
        const globalX: number = startX + x;
        tempTypes[x] = getTemperatureFromNoise(globalX, temperatureNoise);
    }

    let terrain_grass: number[] = [];
    let terrain_stone: number[] = [];

    const scale: number = 0.05;
    const amplitude: number = 20;
    const stoneOffset: number = 4;
    const stoneVariation: number = 3;

    // 地形高度
    for (let x = 0; x < chunk.width; x++) {
        const globalX: number = startX + x;

        let noiseVal: number = terrainNoise.fbm(globalX * scale, 4, 0.5, 2.0);
        let grassHeight: number = sealevel + Math.floor(noiseVal * amplitude);
        grassHeight = Math.min(world_height - 3, Math.max(1, grassHeight));
        if (grassHeight > lowest_point) {lowest_point = grassHeight;} //设置最低点

        let stoneNoiseVal: number = stoneNoise.fbm(globalX * scale * 1.5, 3);
        let stoneHeight: number = grassHeight + stoneOffset + Math.floor(stoneNoiseVal * stoneVariation);
        stoneHeight = Math.min(world_height - 1, Math.max(grassHeight + 1, stoneHeight));

        terrain_grass.push(grassHeight);
        terrain_stone.push(stoneHeight);
    }

    // 填充方块
    for (let y = 0; y < world_height; y++) {
        let worldLine: number[] = [];
        for (let x = 0; x < chunk.width; x++) {
            const globalX: number = startX + x;
            let g: number = terrain_grass[x];
            let s: number = terrain_stone[x];
            let temp: number = getTemperatureFromNoise(globalX, temperatureNoise);

            //根据温度选择方块
            let surfaceBlock, dirtBlock, stoneBlock;
            switch (temp) {
                case TEMP.HOT:
                    surfaceBlock = idOfBlock.sand;
                    dirtBlock = idOfBlock.sand;
                    stoneBlock = idOfBlock.stone;
                    break;
                case TEMP.COLD:
                    surfaceBlock = idOfBlock.snowGrass;
                    dirtBlock = idOfBlock.dirt;
                    stoneBlock = idOfBlock.stone;
                    break;
                default:
                    surfaceBlock = idOfBlock.grass;
                    dirtBlock = idOfBlock.dirt;
                    stoneBlock = idOfBlock.stone;
                    break;
            }

            if (y === g) {worldLine.push(toIndex(surfaceBlock));}
            else if (y > g && y <= s) {
                if (temp === 1 && y >= g + getRandomInt(3, 4)) {worldLine.push(toIndex(idOfBlock.sandstone));}
                else {worldLine.push(toIndex(dirtBlock));}
            } else if (y > s) {worldLine.push(toIndex(stoneBlock));}
            else {worldLine.push(toIndex(idOfBlock.air));}
        }
        worlding.push(worldLine);
    }

    // 生成树、杂草、仙人掌
    generateTrees(worlding, toIndex);
    generateWeeds(worlding, toIndex);
    generateCacti(worlding, toIndex);

    // 洞穴生成（在填充方块之后执行）
    for (let y = 0; y < world_height; y++) {
        for (let x = 0; x < chunk.width; x++) {
            const globalX: number = startX + x;
            if (typeOf(worlding, x, y) !== idOfBlock.stone) {continue;} //只在石头中挖洞

            const stoneTop: number = terrain_stone[x];
            if (y < stoneTop + 4 || y > world_height - 10) {continue;} //垂直范围

            // 使用二维噪声，x 和 y 频率不同，使洞穴沿水平方向延伸更好
            let noiseVal = caveNoise2D.fbm2D(
                globalX * 0.025, // 横向频率（控制洞穴水平间隔）
                y * 0.025, // 纵向频率（控制洞穴垂直分层）
                3, // 八度
                0.5, // 持久性
                2.0 // 倍频
            );
            let secondary = caveNoise2D.fbm2D( // 增加一个次要噪声来添加不规则度
                globalX * 0.08,
                y * 0.06,
                2,
                0.5,
                2.0
            );
            let combined: number = noiseVal * 0.7 + secondary * 0.3;

            function getFbm2D(noiseObj: PerlinNoise): number {
                return noiseObj.fbm2D(globalX * 0.07, y * 0.07, 2, 0.5, 2.0);
            }
            const ore_combined = {
                iron: getFbm2D(ironNoise2D),
                coal: getFbm2D(coalNoise2D),
            };

            // 安山岩、闪长岩、花岗岩（优先级高于矿石，后赋值覆盖矿石）
            const rock_combined = {
                andesite: getFbm2D(andesiteNoise2D),
                diorite: getFbm2D(dioriteNoise2D),
                granite: getFbm2D(graniteNoise2D),
            };

            // 阈值 控制洞穴密度
            const threshold = {
                cave: -0.12, iron: 0.36, coal: 0.32,
                andesite: 0.34, diorite: 0.34, granite: 0.34,
            }
            if (Math.abs(ore_combined.coal) > threshold.coal) {worlding[y][x] = toIndex(idOfBlock.coal_ore);}
            if (Math.abs(ore_combined.iron) > threshold.iron) {worlding[y][x] = toIndex(idOfBlock.iron_ore);}
            if (Math.abs(rock_combined.andesite) > threshold.andesite) {worlding[y][x] = toIndex(idOfBlock.andesite);}
            if (Math.abs(rock_combined.diorite) > threshold.diorite) {worlding[y][x] = toIndex(idOfBlock.diorite);}
            if (Math.abs(rock_combined.granite) > threshold.granite) {worlding[y][x] = toIndex(idOfBlock.granite);}
            if (combined < threshold.cave) {worlding[y][x] = toIndex(idOfBlock.stone_dark);}
        }
    }

    for (let b = 0; b < worlding[0].length; b++) {
        worlding[worlding.length - 1][b] = toIndex(idOfBlock.bedrock);
    }

    // 将当前区块追加到全局世界末尾
    pushChunkToWorld(worlding, behind);
    chunk.num++;
    if (!behind) {chunk.left_number++;}
    chunk.start_x = chunk.num * chunk.width;
    eventBus.emit('chunk:create', behind);
}

// 生成树
function generateTrees(worlding: number[][], toIndex: (id: number) => number): void {
    const oak_x: number[] = [];
    for (let a = 0; a < chunk.width / 20; a++) {
        oak_x.push(getRandomInt(4, chunk.width - 4));
    }
    for (let i = 0; i < oak_x.length; i++) {
        const oak_height: number = getRandomInt(5, 7);
        const leaves_height: number = getRandomInt(3, 4);

        let x: number = oak_x[i];
        let y: number = 0;
        // 找到最上方非空气的方块
        while (y < world_height && typeOf(worlding, x, y) === idOfBlock.air) {y++;}
        if (y < world_height && (typeOf(worlding, x, y) === idOfBlock.grass || typeOf(worlding, x, y) === idOfBlock.snowGrass)) { // 确保是草
            worlding[y][x] = toIndex(idOfBlock.dirt); // 将草换成泥
            for (let k = 0; k < oak_height; k++) {
                y--;
                if (y >= 0) {worlding[y][x] = toIndex(idOfBlock.oak);} // 橡木
            }

            // 树叶
            x--; y--;
            for (let i = 0; i < 3; i++) {
                for (let n = 0; n < leaves_height; n++) {
                    if (y >= 0 && x >= 0 && x < chunk.width && typeOf(worlding, x, y) === idOfBlock.air) {
                        worlding[y][x] = toIndex(idOfBlock.leaves); // 树叶
                    }
                    y++;
                }
                y -= leaves_height;
                x++;
            }
        }
    }
}

// 生成杂草
function generateWeeds(worlding: number[][], toIndex: (id: number) => number): void {
    const inviconGrass_x: number[] = [];
    for (let c = 0; c < chunk.width / 3; c++) {
        inviconGrass_x.push(getRandomInt(0, chunk.width - 1));
    }
    for (let c = 0; c < inviconGrass_x.length; c++) {
        const x: number = inviconGrass_x[c];
        let y: number = 0;
        while (y < world_height && typeOf(worlding, x, y) === idOfBlock.air) {y++;}
        switch (typeOf(worlding, x, y)) {
            case idOfBlock.grass: worlding[y - 1][x] = toIndex(idOfBlock.invicon_grass); break;
            case idOfBlock.sand: worlding[y - 1][x] = toIndex(idOfBlock.deadBush); break;
        }
    }
}

// 生成仙人掌
function generateCacti(worlding: number[][], toIndex: (id: number) => number): void {
    const cactus_x: number[] = [];
    for (let c = 0; c < chunk.width / 16; c++) {
        cactus_x.push(getRandomInt(0, chunk.width - 1));
    }
    for (let c = 0; c < cactus_x.length; c++) {
        const x: number = cactus_x[c];
        let y: number = 0;
        while (y < world_height && typeOf(worlding, x, y) === idOfBlock.air) {y++;}
        if (typeOf(worlding, x, y) !== idOfBlock.sand) {continue;}

        let cactus_height: number = getRandomInt(1, 3);
        while (cactus_height > 0 && y - cactus_height >= 0) {
            worlding[y - cactus_height][x] = toIndex(idOfBlock.cactus);
            cactus_height--;
        }
    }
}

function createChunkAnyTime() {
    if (player.x - chunk.lookRange * 64 <= 0) {
        createChunk(-chunk.width * (chunk.left_number + 1), false);
    } else if (player.x + chunk.lookRange * 64 >= chunk.num * chunk.width * 64) {
        createChunk(chunk.start_x, true);
    }
}

function createWorldMain(): void {
    // 读取存档的 lowest_point
    if (coverWhenSave && notNullUndefined(readingWorld)) {
        if ((!Number.isNaN(readingWorld.lowest_point)) && notNullUndefined(readingWorld.lowest_point)) {
            lowest_point = readingWorld.lowest_point;
            console.log('read the variable lowest_point ok');
        } else {
            lowest_point = sealevel - 16;
            console.log('cannot read the variable lowest_point');
        }
    }

    // 读取存档的世界数组
    if (!coverWhenSave) {
        resetPalette();
        for (let i = 0; i < 8; i++) {
            createChunk(chunk.start_x, true);
        }
        player.initXY();
    } else {
        loadWorld(readingWorld.world);
        // 载入存档自带的调色板；旧存档没有该字段时按方块类型 id 迁移为索引
        if (notNullUndefined(readingWorld.palette) && readingWorld.palette.length > 0) {
            loadPalette(readingWorld.palette);
        } else {
            migrateWorldToPalette();
        }
        // 更新区块状态以匹配加载的世界尺寸，防止 createChunkAnyTime 在错误位置生成新区块
        chunk.num = readingWorld.world[0].length / chunk.width;
        chunk.start_x = chunk.num * chunk.width;
        // 恢复左侧区块计数，保证向左生成新区块时噪声坐标与存档地形连续
        // 旧存档没有该字段时回退为 0
        if (notNullUndefined(readingWorld.left_number) && !Number.isNaN(readingWorld.left_number)) {
            chunk.left_number = readingWorld.left_number;
        } else {
            chunk.left_number = 0;
        }
    }
}
createWorldMain();

export { createChunkAnyTime, lowest_point, seed };
