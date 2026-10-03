import * as PIXI from 'pixi.js';
import { idOfBlock, WATER_FLOW_MAX, WATER_FALLING } from '../nature/blockMecha/blocks.js';
import { getTemperatureAt, TEMP } from '../nature/createWorld.js';
import { BlockState, worldXAt } from '../world.js';
import { applyColoredLightTint } from './light.js';
import { app } from './rendering.js';

export let blockFrameLoaded: boolean = false;
const blockFrameUrl: {
    fire: string; waterStill: string; waterFlow: string;
} = {
    fire: '/assets/images/games/others/fire_0.png',
    waterStill: '/assets/images/games/blocks/water_still.png',
    waterFlow: '/assets/images/games/blocks/water_flow.png',
};
export function initBlockFrames(): void {
    PIXI.Assets.load<Record<string, PIXI.Texture>>(Object.values(blockFrameUrl)).then((textures: Record<string, PIXI.Texture>) => {
        fireFrames.push(...splitFrames(textures[blockFrameUrl.fire], fireMaxTick + 1));
        waterFrames.push(...splitFrames(textures[blockFrameUrl.waterStill], waterMaxTick + 1));
        waterFlowFrames.push(...splitFrames(textures[blockFrameUrl.waterFlow], waterMaxTick + 1, frameSize * 2));
        bakeWaterSlopeFrames();
        blockFrameLoaded = true;
    }).catch((error: unknown) => {
        console.error('load block frames error', error);
    });
}

const frameSize: number = 16; // 帧图中单帧的边长

// 把整张帧图切成逐帧纹理，stepY 为相邻两帧的间距
function splitFrames(sheet: PIXI.Texture, frameCount: number, stepY: number = frameSize): PIXI.Texture[] {
    const frames: PIXI.Texture[] = [];
    for (let i = 0; i < frameCount; i++) {
        const frame: PIXI.Rectangle = new PIXI.Rectangle(0, i * stepY, frameSize, frameSize);
        frames.push(new PIXI.Texture(sheet.baseTexture, frame));
    }
    return frames;
}

let timer: number = 0;
let waterTimer: number = 0;

const fireMaxTick: number = 31;
let fireTick: number = 0; // 0 ~ 31
let fireFrames: PIXI.Texture[] = [];

const waterMaxTick: number = 31;
let waterTick: number = 0; // 0 ~ 31
let waterFrames: PIXI.Texture[] = [];
let waterFlowFrames: PIXI.Texture[] = []; // 竖直水流
let waterSlopeFrames: PIXI.Texture[][] = []; // 水平水流的梯形帧 [slot][waterTick]，slot = (condition - 1) * 2 + direction
const waterTickDelta: number = 4; // 水每个动画帧持续的 delta 数

function main(): void {
    initBlockFrames();
}
main();

export function blockFrameLoop(delta: number): void {
    timer += delta;
    if (timer >= 2) {
        timer = 0;
        fireTick = (fireTick + 1) % (fireMaxTick + 1);
    }

    waterTimer += delta;
    if (waterTimer >= waterTickDelta) {
        waterTimer = 0;
        waterTick = (waterTick + 1) % (waterMaxTick + 1);
    }
}

// 当地温度对应的水颜色
function waterColorOfTemperature(temp: number): number {
    switch (temp) {
        case TEMP.HOT: return 0x43D5EE;
        case TEMP.COLD: return 0x3938C9;
        default: return 0x3F76E4;
    }
}

// 世界列号处的水颜色
function waterColorAt(worldCol: number): number {
    return waterColorOfTemperature(getTemperatureAt(worldXAt(worldCol)));
}

// 水平水流的梯形：上游边高 2 * condition 像素，下游边低 2 像素，坡度方向由 direction 决定
function slopeHeight(condition: number, x: number, direction: number): number {
    const upstream: number = condition * 2;
    const downstream: number = Math.max(1, upstream - 2);
    const t: number = direction === 0 ? frameSize - 1 - x : x; // 0 在上游边，frameSize - 1 在下游边
    return Math.round(upstream - (upstream - downstream) * t / (frameSize - 1));
}

// 预渲染水平水流的梯形帧
function bakeWaterSlopeFrames(): void {
    const columns: number = waterMaxTick + 1;
    const rows: number = WATER_FLOW_MAX * 2;
    const atlas: PIXI.RenderTexture = PIXI.RenderTexture.create({ width: frameSize * columns, height: frameSize * rows });
    const stage: PIXI.Container = new PIXI.Container();

    for (let slot = 0; slot < rows; slot++) {
        const condition: number = Math.floor(slot / 2) + 1;
        const direction: number = slot % 2;

        stage.removeChildren();
        for (let frameIndex = 0; frameIndex < columns; frameIndex++) {
            const frame: PIXI.Texture = waterFrames[frameIndex];
            for (let x = 0; x < frameSize; x++) {
                const height: number = slopeHeight(condition, x, direction);
                const source: PIXI.Rectangle = new PIXI.Rectangle(frame.frame.x + x, frame.frame.y + frameSize - height, 1, height);
                const column: PIXI.Sprite = new PIXI.Sprite(new PIXI.Texture(frame.baseTexture, source));
                column.position.set(frameIndex * frameSize + x, slot * frameSize + frameSize - height);
                stage.addChild(column);
            }
        }
        app.renderer.render(stage, { renderTexture: atlas, clear: slot === 0 });
    }
    stage.removeChildren();

    waterSlopeFrames = [];
    for (let slot = 0; slot < rows; slot++) {
        const frames: PIXI.Texture[] = [];
        for (let frameIndex = 0; frameIndex < columns; frameIndex++) {
            const rect: PIXI.Rectangle = new PIXI.Rectangle(frameIndex * frameSize, slot * frameSize, frameSize, frameSize);
            frames.push(new PIXI.Texture(atlas.baseTexture, rect));
        }
        waterSlopeFrames.push(frames);
    }
}

// 按 condition 选帧：水源与未知值用静水，1~7 用梯形，8 用竖直水流
function waterTextureOf(state: BlockState): PIXI.Texture {
    if (state.condition === WATER_FALLING) {return waterFlowFrames[waterTick];}
    if (state.condition >= 1 && state.condition <= WATER_FLOW_MAX) {
        const frames: PIXI.Texture[] | undefined = waterSlopeFrames[(state.condition - 1) * 2 + (state.direction === 0 ? 0 : 1)];
        if (frames) {return frames[waterTick];}
    }
    return waterFrames[waterTick];
}

// 绘制水方块 返回是否已接管该格的绘制
export function drawWaterSprite(sprite: PIXI.Sprite, state: BlockState, draw_x: number, draw_y: number, worldCol: number, worldRow: number): boolean {
    if (state.type !== idOfBlock.water) {return false;}

    const texture: PIXI.Texture = waterTextureOf(state);
    if (!texture) {
        sprite.visible = false;
        return true;
    }

    sprite.texture = texture;
    sprite.scale.x = Math.abs(sprite.scale.x); // 清掉火把镜像留下的负缩放
    sprite.position.set(draw_x, draw_y);
    applyColoredLightTint(sprite, worldCol * 64, worldRow * 64, waterColorAt(worldCol));
    sprite.visible = true;
    return true;
}
