import { world_height, getRandomInt, chunk } from "../const.js";
import { room } from "../../constants/generic.js";
import { checkBlock } from "../rendering.js";
import { player } from "../player.js";
import { apioxTime } from "../../apiox/time.js";
import { coverWhenSave, readingWorld } from "../gameState.js";
import { notNullUndefined } from "../../constants/utils.js";

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

const canvas_sky = document.getElementById('gamebackground') as HTMLCanvasElement;
$('#gamebackground').css({
    'width': room.width + 'px',
    'height': room.height + 'px',
    'position': 'absolute',
    'left': '0',
    'top': '0'
});
canvas_sky.width = room.width;
canvas_sky.height = room.height;
export let sky_isDrawing: boolean = false;
const ctx_sky: CanvasRenderingContext2D = canvas_sky.getContext('2d');
ctx_sky.imageSmoothingEnabled = false;
const sky_img = {
    moon: new Image(),
}
sky_img.moon.src = 'assets/images/games/others/moon_phases.png';
const sky_images = [sky_img.moon];
let imagesLoaded: number = 0;
function checkAllLoaded(): void {
    imagesLoaded++;
    if (imagesLoaded === sky_images.length) {
        sky_isDrawing = true;
    }
}
sky_images.forEach(sky_img => sky_img.addEventListener('load', checkAllLoaded));

//离屏canvas用于背景图片的绘制
const offCanvas = document.createElement('canvas');
offCanvas.width = room.width;
offCanvas.height = room.height;
const offCtx = offCanvas.getContext('2d');
offCtx.imageSmoothingEnabled = false;

class BgImages {
    blocks: number[][]; //背景图层存放的方块
    depth: number; //纵深
    width: number; height: number; //单位：格

    constructor(depth: number) {
        this.blocks = [];
        this.depth = depth;
        this.width = 32; this.height = 32;
    }

    createBlocks() { //生成背景图片的地形
        this.blocks = []; //重置避免累积
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
                    worldLine.push(0); // 草
                } else if (k > terrain_grass[i]) {
                    worldLine.push(1); // 泥
                }
                else {worldLine.push(-1);} // 海平面以上为空气
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
                    if (y >= 0) {this.blocks[y][x] = -2;} // 橡木
                }

                // 树叶
                x -= 1; y -= 1;
                for (let i = 0; i < 3; i++) {
                    for (let n = 0; n < leaves_height; n++) {
                        if (y >= 0 && x >= 0 && x < this.width && this.blocks[y][x] === -1) {
                            this.blocks[y][x] = 3; // 树叶
                        }
                        y++;
                    }
                    y -= leaves_height;
                    x++;
                }
            }
        }
    }

    drawBgBlocks(initx: number, inity: number, alpha: number = 0.5) { //绘制背景图片
        let draw_y: number = inity;
        for(let k = 0; k < this.height; k++) {
            if (!this.blocks[k]) {break;}
            let draw_x: number = initx;
            for(let i = 0; i < this.width; i++) {
                checkBlock(offCtx, this.blocks[k][i], draw_x, draw_y, 32, 32);
                draw_x += 32;
            }
            draw_y += 32;
        }

        switch(getPhase()) {
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
    offCtx.clearRect(0, 0, room.width, room.height);
    bg_a.createBlocks();
    bg_a.drawBgBlocks(0, -128, 0.4);
    bg_b.createBlocks();
    bg_b.drawBgBlocks(0, 0);
}

const clock: { timer: number; daylong: number; addTimer: () => void } = {
    timer: 128, //天空计时器
    daylong: 1440,
    addTimer() {
        if (!sky_isDrawing) {return;}

        this.timer++;
        if (this.timer >= this.daylong) {this.timer = 0;}

        //定时渲染背景
        if (this.timer % 10 === 0) {
            offCtx.clearRect(0, 0, room.width, room.height);
            bg_a.drawBgBlocks(0, -128, 0.4);
            bg_b.drawBgBlocks(0, 0);
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

apioxTime.setInt(() => { //开始计时
    clock.addTimer();
}, 1000);

// 根据当前时间获取阶段名称
function getPhase(): number { // 0日出 1白天 2日落 3夜晚
    if (clock.timer < SUNRISE_END) {return 0;}
    if (clock.timer < DAY_END) {return 1;}
    if (clock.timer < SUNSET_END) {return 2;}
    return 3;
}

function drawSun() { //绘制太阳和月亮
    //通过时间得到天体位置
    sun.x = room.width * clock.timer / (clock.daylong / 2);
    const sun_normalizedX: number = (2 * sun.x - room.width) / room.width;
    sun.y = -(room.height - 128) * Math.sqrt(1 - sun_normalizedX * sun_normalizedX) + room.height;

    // 月亮位置：时间偏移12小时，使太阳与月亮交替出现
    const moonTime: number = (clock.timer + clock.daylong / 2) % clock.daylong;
    moon.x = room.width * moonTime / (clock.daylong / 2);
    const moon_normalizedX: number = (2 * moon.x - room.width) / room.width;
    moon.y = -(room.height - 128) * Math.sqrt(1 - moon_normalizedX * moon_normalizedX) + room.height;

    //绘制太阳
    ctx_sky.shadowColor = 'white'; //颜色
    ctx_sky.shadowBlur = 32; //模糊半径
    ctx_sky.shadowOffsetX = 0; //偏移为0
    ctx_sky.shadowOffsetY = 0;
    ctx_sky.fillStyle = 'white';
    ctx_sky.fillRect(sun.x, sun.y, 64, 64);
    ctx_sky.shadowColor = 'transparent'; //重置阴影，避免影响后续绘制

    //绘制月亮
    if (sky_isDrawing) {
        let alpha: number = Math.max(0, Math.min(1, moon.x / 512));
        ctx_sky.globalAlpha = alpha;
        ctx_sky.shadowColor = '#3d5aa1';
        ctx_sky.shadowBlur = 32;
        ctx_sky.shadowOffsetX = 0;
        ctx_sky.shadowOffsetY = 0;
        ctx_sky.drawImage(sky_img.moon, 12, 12, 8, 8, moon.x, moon.y, 64, 64);
        ctx_sky.globalAlpha = 1.0; // 恢复，避免影响后续绘制
        ctx_sky.shadowColor = 'transparent';
    }
}

function getSkyGradient(t: number): {top: string; bottom: string} {
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
        top: `rgb(${Math.round(topR)}, ${Math.round(topG)}, ${Math.round(topB)})`,
        bottom: `rgb(${Math.round(botR)}, ${Math.round(botG)}, ${Math.round(botB)})`
    };
}

function drawSkyBackground(): void {
    const { top, bottom } = getSkyGradient(clock.timer);
    const gradient: CanvasGradient = ctx_sky.createLinearGradient(0, 0, 0, room.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx_sky.fillStyle = gradient;
    ctx_sky.fillRect(0, 0, room.width, room.height);
}

function drawTiledBackground(
    ctx: CanvasRenderingContext2D,
    img: HTMLCanvasElement,
    offsetX: number,
    offsetY: number
): void {
    const imgW = new BgImages(0).width * 32;
    // 水平方向平铺起始点
    let startX = ((offsetX % imgW) + imgW) % imgW;
    let drawX = -startX;
    while (drawX < room.width) {
        // 垂直方向只画一次，从 0 开始
        ctx.drawImage(img, drawX, offsetY);
        drawX += imgW;
    }
}

export function skyLoop(): void {
    drawSkyBackground();
    drawSun();

    const parallaxFactor: number = 0.05; //极慢视差因子（远景微微移动）
    const offsetX = (player.x - chunk.left_number*chunk.width*64) * parallaxFactor;
    let offsetY: number = -(player.y - world_height*32) * parallaxFactor * 4;
    offsetY = Math.max(-64, offsetY); //最大竖直位移

    drawTiledBackground(ctx_sky, offCanvas, offsetX, offsetY + 128);
}

export { ctx_sky, canvas_sky, initSkyBackground, clock };