import { world_height, chunk } from "../world.js";
import { getRandomInt } from "../const.js";
import { room } from "../../constants/generic.js";
import { checkBlock } from "../rendering.js";
import { player } from "../player.js";
import { apioxTime } from "../../apiox/time.js";
import { coverWhenSave, readingWorld } from "../gameState.js";
import { notNullUndefined } from "../../constants/utils.js";
import * as PIXI from 'pixi.js';
import { idOfBlock } from "./blockMecha/blocks.js";

// 时间常量 单位：秒
//const DAY_LENGTH: number = 1440; // 一天总秒数
const SUNRISE_DUR: number = 90; // 日出 1.5分钟
const DAY_DUR: number = 720; // 白天 12分钟
const SUNSET_DUR: number = 90; // 黄昏 1.5分钟
//const NIGHT_DUR: number = 540; // 夜晚 9分钟

// 阶段边界(累计秒数
const SUNRISE_END: number = SUNRISE_DUR;
const DAY_END: number = SUNRISE_END + DAY_DUR;
const SUNSET_END: number = DAY_END + SUNSET_DUR;

export let sky_isDrawing: boolean = false;

// PixiJS 天空图层
// 天空容器位于舞台最底层（zIndex=0，世界图层为 1），由 rendering.ts 创建舞台后调用 initSkyContainer 挂载
const skyContainer: PIXI.Container = new PIXI.Container();
export function initSkyContainer(stage: PIXI.Container): void {
    if (skyContainer.parent) {return;} // 防止重复挂载
    skyContainer.zIndex = 0;
    stage.addChild(skyContainer);
}

// 太阳（Graphics 绘制）
let sunContainer: PIXI.Container;
let sunGlow: PIXI.Graphics;
let sunCore: PIXI.Graphics;

// 月亮（Sprite 绘制）
// 月相图为无透明通道的 RGB 贴图，不能直接 tint 出辉光，故蓝色光晕用圆形 Graphics + BlurFilter 模拟
let moonContainer: PIXI.Container;
let moonSprite: PIXI.Sprite;
let moonGlow: PIXI.Graphics;
let moonTex: PIXI.Texture; // 月相图加载完成后缓存，供 initSkyBackground 创建精灵时使用

// 月相图通过 PIXI.Assets 加载（不使用 Web API），加载完成后设置纹理。
// 注意：加载通常先于 initSkyBackground 完成，故先存入 moonTex，待精灵创建时再赋值
PIXI.Assets.load('/assets/images/games/others/moon_phases.png').then((tex: PIXI.Texture) => {
    moonTex = new PIXI.Texture(tex.baseTexture, new PIXI.Rectangle(12, 12, 8, 8));
    if (moonSprite) {moonSprite.texture = moonTex;}
    sky_isDrawing = true;
});

// 天空渐变（Graphics 色带近似）
// PIXI 无原生渐变，按原 canvas 线性渐变相同的插值方式逐层绘制色带
const GRADIENT_STRIP_H: number = 4; // 每条色带高度（4px 一层，视觉与平滑渐变基本一致）
let gradientGraphics: PIXI.Graphics;
let lastGradientTimer: number = -1;

// 离屏canvas用于背景地形的绘制（作为平铺纹理源）
const offCanvas = document.createElement('canvas');
offCanvas.width = room.width;
offCanvas.height = room.height;
const offCtx = offCanvas.getContext('2d');
offCtx.imageSmoothingEnabled = false;
const bgTex: PIXI.Texture = PIXI.Texture.from(offCanvas);

// 平铺背景精灵（initSkyBackground 中创建）
const bgTiles: PIXI.Sprite[] = [];
const BG_TILE_W: number = 32 * 32; // 背景贴图水平平铺宽度（32格 x 32px）

class BgImages {
    blocks: number[][]; // 背景图层存放的方块
    depth: number; // 纵深
    width: number; height: number; // 单位：格

    constructor(depth: number) {
        this.blocks = [];
        this.depth = depth;
        this.width = 32; this.height = 32;
    }

    createBlocks() { // 生成背景图片的地形
        this.blocks = []; // 重置避免累积
        const sealevel = Math.round(this.height / 2);
        let terrain_grass: number[] = new Array(this.width);
        
        // 随机决定波形参数
        const waveCount = getRandomInt(1, 4);        // 1~3 个正弦波叠加
        const amplitude = getRandomInt(2, 6);        // 振幅 2~6 格
        const phaseShift = getRandomInt(0, 360) * Math.PI / 180; // 随机相位
        
        for (let a = 0; a < this.width; a++) {
            let heightOffset = 0;
            // 叠加多个正弦波，每个波的周期都是 (this.width - 1) 的整数倍
            for (let w = 1; w <= waveCount; w++) {
                // 周期 = (this.width - 1) / w，确保首尾相位相同
                const angle = 2 * Math.PI * w * a / (this.width - 1) + phaseShift;
                heightOffset += Math.sin(angle) * (amplitude / waveCount);
            }
            let grassTop = sealevel + Math.round(heightOffset);
            terrain_grass[a] = grassTop;
        }

        // 可选：添加少量随机噪声，让地形更自然（但不破坏连续性）
        for (let a = 1; a < this.width - 1; a++) {
            if (getRandomInt(0, 5) === 0) {
                terrain_grass[a] += getRandomInt(-1, 1);
            }
        }

        //把决定好的地形存储进world数组
        for (let k = 0; k < this.height; k++) {
            let worldLine: number[] = [];
            for (let i = 0; i < this.width; i++) {
                if (k === terrain_grass[i]) {
                    worldLine.push(idOfBlock.grass); // 草
                } else if (k > terrain_grass[i]) {
                    worldLine.push(idOfBlock.dirt); // 泥
                } else {
                    worldLine.push(idOfBlock.air); // 海平面以上为空气
                } 
            }
            this.blocks.push(worldLine); // 将一行作为数组推入二维数组
        }

        //生成树
        let oak_x = [];
        for (let a = 0; a < this.width / 20; a++) {
            oak_x.push(getRandomInt(4, this.width - 4));
        }
        for (let i = 0; i < oak_x.length; i++) {
            let oak_height = getRandomInt(5, 7);
            let leaves_height = getRandomInt(3, 4);

            let x = oak_x[i];
            let y = 0;
            // 找到最上方非空气的方块（即草或泥所在位置）
            while (y < this.height && this.blocks[y][x] === -1) {
                y++;
            }
            if (y < this.height && this.blocks[y][x] === 0) { // 确保是草
                this.blocks[y][x] = 1; // 将草换成泥（树干根部）
                for (let k = 0; k < oak_height; k++) {
                    y--;
                    if (y >= 0) {this.blocks[y][x] = idOfBlock.oak;} // 橡木
                }

                // 树叶
                x -= 1; y -= 1;
                for (let i = 0; i < 3; i++) {
                    for (let n = 0; n < leaves_height; n++) {
                        if (y >= 0 && x >= 0 && x < this.width && this.blocks[y][x] === -1) {
                            this.blocks[y][x] = idOfBlock.leaves; // 树叶
                        }
                        y++;
                    }
                    y -= leaves_height;
                    x++;
                }
            }
        }
    }

    drawBgBlocks(initx: number, inity: number, alpha: number = 0.5) { // 绘制背景图片
        let draw_y: number = inity;
        for (let k = 0; k < this.height; k++) {
            if (!this.blocks[k]) {break;}
            let draw_x: number = initx;
            for (let i = 0; i < this.width; i++) {
                checkBlock(offCtx, this.blocks[k][i], draw_x, draw_y, 32, 32);
                draw_x += 32;
            }
            draw_y += 32;
        }

        switch (getPhase()) {
            case 0: offCtx.fillStyle = `rgba(${0 + 2*clock.timer}, ${0 + (20/9)*clock.timer}, ${0 + 2.8*clock.timer}, ${alpha})`; break;
            case 1: offCtx.fillStyle = `rgba(180, 200, 255, ${alpha})`; break;
            case 2: offCtx.fillStyle = `rgba(${180 - 2*(clock.timer - DAY_END)}, ${200 - 20/9*(clock.timer - DAY_END)}, ${255 - 2.8*(clock.timer - DAY_END)}, ${alpha})`; break;
            default: offCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`; break;
        }
        offCtx.globalCompositeOperation = 'source-atop';
        offCtx.fillRect(0, 0, room.width, room.height);
        offCtx.globalCompositeOperation = 'source-over';
    }
}

const bg_a = new BgImages(0);
const bg_b = new BgImages(0);

function initSkyBackground(): void {
    // 把背景地形绘制进离屏画布，再上传为纹理
    offCtx.clearRect(0, 0, room.width, room.height);
    bg_a.createBlocks();
    bg_a.drawBgBlocks(0, -128, 0.4);
    bg_b.createBlocks();
    bg_b.drawBgBlocks(0, 0);
    bgTex.baseTexture.update();

    // 创建天空精灵（添加顺序即绘制层级：渐变 -> 太阳 -> 月亮 -> 平铺地形）

    // 渐变
    gradientGraphics = new PIXI.Graphics();
    skyContainer.addChild(gradientGraphics);

    // 太阳（白色方块本体 + 柔光层，64x64 本体位于原点中心，绘制时以 sun.x/sun.y 为左上角）
    sunGlow = new PIXI.Graphics();
    sunGlow.beginFill(0xffffff);
    sunGlow.drawRect(-34, -34, 68, 68);
    sunGlow.endFill();
    sunGlow.filters = [new PIXI.BlurFilter(16)]; // 对应原版 shadowBlur=32
    sunCore = new PIXI.Graphics();
    sunCore.beginFill(0xffffff);
    sunCore.drawRect(-32, -32, 64, 64);
    sunCore.endFill();
    sunContainer = new PIXI.Container();
    sunContainer.addChild(sunGlow);
    sunContainer.addChild(sunCore);
    skyContainer.addChild(sunContainer);

    // 月亮（本体 Sprite + 蓝色圆形光晕，纹理在月相图加载完成后设置）
    moonGlow = new PIXI.Graphics();
    moonGlow.beginFill(0x3d5aa1); // 原版 shadowColor
    moonGlow.drawRect(-34, -34, 68, 68); // 光晕
    moonGlow.endFill();
    moonGlow.filters = [new PIXI.BlurFilter(8)]; // 对应原版 shadowBlur=32
    moonGlow.alpha = 0.6;
    moonSprite = new PIXI.Sprite(moonTex ? moonTex : PIXI.Texture.EMPTY); // 月相图可能已加载完成，直接用缓存的纹理
    moonSprite.width = 64;
    moonSprite.height = 64;
    moonSprite.anchor.set(0.5);
    moonContainer = new PIXI.Container();
    moonContainer.addChild(moonGlow);
    moonContainer.addChild(moonSprite);
    skyContainer.addChild(moonContainer);

    // 平铺背景精灵池（覆盖 1280 宽的屏幕最多需要 3 张）
    for (let i = 0; i < 4; i++) {
        const tile: PIXI.Sprite = new PIXI.Sprite(bgTex);
        tile.visible = false;
        skyContainer.addChild(tile);
        bgTiles.push(tile);
    }
}

const clock: { timer: number; daylong: number; addTimer: () => void } = {
    timer: 128, // 天空计时器
    daylong: 1440,
    addTimer() {
        if (!sky_isDrawing) {return;}

        this.timer++;
        if (this.timer >= this.daylong) {this.timer = 0;}

        // 定时重绘背景地形（含天色染色），并重新上传纹理
        if (this.timer % 10 === 0) {
            offCtx.clearRect(0, 0, room.width, room.height);
            bg_a.drawBgBlocks(0, -128, 0.4);
            bg_b.drawBgBlocks(0, 0);
            bgTex.baseTexture.update();
        }
    }
};

// 读档时恢复 clock.timer
if (coverWhenSave && notNullUndefined(readingWorld)) {
    if ((!Number.isNaN(readingWorld.skyTimer)) && notNullUndefined(readingWorld.skyTimer)) {
        clock.timer = readingWorld.skyTimer;
    } else {
        clock.timer = 128;
    }
}

class Celestials {
    x: number; y: number;
    constructor(){
        this.x = 0; this.y = 0;
    }
}
const sun = new Celestials();
const moon = new Celestials();

apioxTime.setInt(() => { // 开始计时
    clock.addTimer();
}, 1000);

// 根据当前时间获取阶段名称
function getPhase(): number { // 0日出 1白天 2日落 3夜晚
    if (clock.timer < SUNRISE_END) {return 0;}
    if (clock.timer < DAY_END) {return 1;}
    if (clock.timer < SUNSET_END) {return 2;}
    return 3;
}

function drawSun(): void { // 绘制太阳和月亮
    if (!sunContainer) {return;}
    // 通过时间得到天体位置
    sun.x = room.width * clock.timer / (clock.daylong / 2);
    const sun_normalizedX: number = (2 * sun.x - room.width) / room.width;
    sun.y = -(room.height - 128) * Math.sqrt(1 - sun_normalizedX * sun_normalizedX) + room.height;

    // 月亮位置：时间偏移12小时，使太阳与月亮交替出现
    const moonTime: number = (clock.timer + clock.daylong / 2) % clock.daylong;
    moon.x = room.width * moonTime / (clock.daylong / 2);
    const moon_normalizedX: number = (2 * moon.x - room.width) / room.width;
    moon.y = -(room.height - 128) * Math.sqrt(1 - moon_normalizedX * moon_normalizedX) + room.height;

    // 绘制太阳（本体 64x64 的左上角对齐 sun.x/sun.y，与 fillRect(sun.x, sun.y, 64, 64) 一致）
    sunContainer.position.set(sun.x + 32, sun.y + 32);

    // 绘制月亮（随时间渐入淡出，与原版 alpha = moon.x/512 一致）
    if (moonContainer) {
        moonContainer.alpha = Math.max(0, Math.min(1, moon.x / 512));
        moonContainer.position.set(moon.x + 32, moon.y + 32);
    }
}

// 返回天空渐变顶部/底部颜色（数值形式，与原版插值逻辑一致）
function getSkyGradient(t: number): { topR: number; topG: number; topB: number; botR: number; botG: number; botB: number } {
    let topR: number, topG: number, topB: number, botR: number, botG: number, botB: number;

    if (t < SUNRISE_END) {
        // 日出：深蓝黑 → #78A7FF / 浅蓝
        const p = t / SUNRISE_END;
        topR = 8 + (120 - 8) * p;
        topG = 12 + (167 - 12) * p;
        topB = 28 + (255 - 28) * p;
        botR = 20 + (180 - 20) * p;
        botG = 15 + (220 - 15) * p;
        botB = 10 + (255 - 10) * p;
    } else if (t < DAY_END) {
        // 整个白天（90~810秒）固定明亮色彩
        topR = 120;
        topG = 167;
        topB = 255;
        botR = 180;
        botG = 220;
        botB = 255;
    } else if (t < SUNSET_END) {
        // 黄昏（810~900秒），共90秒，分两段过渡
        const subT = t - DAY_END; // 0 ~ 90
        if (subT < 45) {
            // 前45秒：白天色 → 黄昏色 (61,76,123) / (216,118,73)
            const p = subT / 45;
            topR = 120 + (61 - 120) * p;
            topG = 167 + (76 - 167) * p;
            topB = 255 + (123 - 255) * p;
            botR = 180 + (216 - 180) * p;
            botG = 220 + (118 - 220) * p;
            botB = 255 + (73 - 255) * p;
        } else {
            // 后45秒：黄昏色 → 夜晚深色
            const p = (subT - 45) / 45;
            topR = 61 + (8 - 61) * p;
            topG = 76 + (12 - 76) * p;
            topB = 123 + (28 - 123) * p;
            botR = 216 + (20 - 216) * p;
            botG = 118 + (15 - 118) * p;
            botB = 73 + (10 - 73) * p;
        }
    } else {
        // 夜晚：恒定深蓝黑色（与日出开始衔接）
        topR = 8;
        topG = 12;
        topB = 28;
        botR = 20;
        botG = 15;
        botB = 10;
    }

    return {
        topR: Math.round(topR), topG: Math.round(topG), topB: Math.round(topB),
        botR: Math.round(botR), botG: Math.round(botG), botB: Math.round(botB)
    };
}

function drawSkyBackground(): void {
    if (lastGradientTimer === clock.timer) {return;} // 计时器每秒变化一次，仅在其变化时重绘
    lastGradientTimer = clock.timer;
    const { topR, topG, topB, botR, botG, botB } = getSkyGradient(clock.timer);
    gradientGraphics.clear();
    for (let y = 0; y < room.height; y += GRADIENT_STRIP_H) {
        // 按 canvas 线性渐变相同的插值方式计算每层颜色
        const p = y / (room.height - 1);
        const r = Math.round(topR + (botR - topR) * p);
        const g = Math.round(topG + (botG - topG) * p);
        const b = Math.round(topB + (botB - topB) * p);
        gradientGraphics.beginFill((r << 16) | (g << 8) | b);
        gradientGraphics.drawRect(0, y, room.width, Math.min(GRADIENT_STRIP_H, room.height - y));
        gradientGraphics.endFill();
    }
}

function drawTiledBackground(offsetX: number, offsetY: number): void {
    // 水平方向平铺起始点
    let startX = ((offsetX % BG_TILE_W) + BG_TILE_W) % BG_TILE_W;
    let drawX = -startX;
    let i: number = 0;
    while (drawX < room.width && i < bgTiles.length) {
        const tile: PIXI.Sprite = bgTiles[i];
        // 垂直方向只画一次，从 0 开始
        tile.position.set(drawX, offsetY);
        tile.visible = true;
        drawX += BG_TILE_W;
        i++;
    }
    // 隐藏多余的平铺精灵
    for (; i < bgTiles.length; i++) {
        bgTiles[i].visible = false;
    }
}

export function skyLoop(): void {
    if (!sunContainer) {return;} // 图片加载完成前跳过

    drawSkyBackground();
    drawSun();

    const parallaxFactor: number = 0.05; // 极慢视差因子（远景微微移动）
    const offsetX = (player.x - chunk.left_number*chunk.width*64) * parallaxFactor;
    let offsetY: number = -(player.y - world_height*32) * parallaxFactor * 4;
    offsetY = Math.max(-64, offsetY); // 最大竖直位移

    drawTiledBackground(offsetX, offsetY + 128);
}

export { initSkyBackground, clock };
