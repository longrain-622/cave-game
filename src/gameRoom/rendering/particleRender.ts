import * as PIXI from 'pixi.js';

import { player } from '../player.js';
import { isOnScreen } from '../const.js';
import { app, blockTextures, isDrawing } from './rendering.js';
import { applyLightTint } from './light.js';
import { eventBus } from '../others/eventBus.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { particleArray, particleType, Particles, splashFrameSize, splashFrameCount } from '../particle.js';

// Particle images
const particleAssets: Record<string, string> = {
    splash: '/assets/images/games/particle/splash.png',
};

const splashFrames: PIXI.Texture[] = []; // all children parts in splash textures

const particleLayer: PIXI.Container = new PIXI.Container();
export let can_drawParticle: boolean = false;
const subTextureCache: Record<string, PIXI.Texture> = {}; // 子纹理缓存

// 从方块贴图中裁剪子区域
function getSubTexture(
    type: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
): PIXI.Texture | undefined {
    const baseTexture: PIXI.Texture = blockTextures[type];
    if (!baseTexture) {return undefined;}

    const key: string = type + '_' + sx + '_' + sy + '_' + sw + '_' + sh;
    if (!subTextureCache[key]) {
        subTextureCache[key] = new PIXI.Texture(
            baseTexture.baseTexture,
            new PIXI.Rectangle(sx, sy, sw, sh),
        );
    }
    return subTextureCache[key];
}

// 粒子的绘制方式
interface ParticleDrawing {
    texture: (particle: Particles) => PIXI.Texture | undefined;
    anchor: number;
}

// 从自己的方块贴图里裁一小块
function blockParticleTexture(particle: Particles): PIXI.Texture | undefined {
    let sx: number = 0;
    let sy: number = 0;

    switch (particle.type) {
        case idOfBlock.invicon_grass:
        case idOfBlock.deadBush:
        case idOfBlock.chest:
            sx = 8;
            sy = 12;
            break;

        case idOfBlock.oak_door_bottom:
        case idOfBlock.oak_door_top:
        case idOfBlock.oak_door_bottom_open:
        case idOfBlock.oak_door_top_open:
            sx = 6;
            break;
    }

    return getSubTexture(
        particle.type,
        sx,
        sy,
        Math.round(particle.width / 4),
        Math.round(particle.height / 4),
    );
}

// 水花用自己的 part 子纹理，frame 决定用哪一个
function splashParticleTexture(particle: Particles): PIXI.Texture | undefined {
    return splashFrames[particle.frame];
}

const blockParticleDrawing: ParticleDrawing = {
    texture: blockParticleTexture,
    anchor: 0,
};

// 绘制方式登记表
const particleDrawings: Record<number, ParticleDrawing> = {
    [particleType.splash]: {
        texture: splashParticleTexture,
        anchor: 0.5,
    },
};

function particleDrawingAt(type: number): ParticleDrawing {
    return particleDrawings[type] ?? blockParticleDrawing;
}

const particleSpriteMap: Map<Particles, PIXI.Sprite> = new Map(); // 每个粒子对应的渲染 Sprite

// 把 splash.png 切成 4 个 part 的子纹理，粒子的 frame 决定用哪一个
function initSplashFrames(): void {
    PIXI.Assets.load<PIXI.Texture>(particleAssets.splash).then((texture: PIXI.Texture) => {
        for (let i: number = 0; i < splashFrameCount; i++) {
            const frame: PIXI.Rectangle = new PIXI.Rectangle(
                i * splashFrameSize,
                0,
                splashFrameSize,
                splashFrameSize,
            );
            splashFrames.push(new PIXI.Texture(texture.baseTexture, frame));
        }
    }).catch((error: unknown) => {
        console.error('load splash particle texture error', error);
    });
}

function markTexturesReady(): void {
    can_drawParticle = true;
}

function main(): void {
    app.stage.addChild(particleLayer);
    particleLayer.zIndex = 3.6;
    // 本模块可能晚于 textures:ready 事件求值，因此先检查一次当前状态
    if (isDrawing) {markTexturesReady();}
    else {eventBus.once('textures:ready', markTexturesReady);}
    initSplashFrames();
}
main();

export function drawParticles(): void {
    if (!can_drawParticle) {
        if (!isDrawing) {return;}
        can_drawParticle = true; // 兜底：即使错过 textures:ready 事件，纹理就绪后也能开始绘制
    }

    // 兜底清理已移除粒子的渲染 Sprite
    const aliveParticles: Set<Particles> = new Set(particleArray);
    for (const [particle, sprite] of particleSpriteMap) {
        if (aliveParticles.has(particle)) {continue;}
        particleLayer.removeChild(sprite);
        sprite.destroy();
        particleSpriteMap.delete(particle);
    }

    for (let k = 0; k < particleArray.length; k++) {
        const obj: Particles = particleArray[k];
        const drawing: ParticleDrawing = particleDrawingAt(obj.type);
        const originX: number = obj.width * drawing.anchor;
        const originY: number = obj.height * drawing.anchor;
        const screenX: number = player.screen_x + obj.x - player.x - originX;
        const screenY: number = player.screen_y + obj.y - player.y - originY;

        let sprite: PIXI.Sprite | undefined = particleSpriteMap.get(obj);
        if (!sprite) {
            sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            particleLayer.addChild(sprite);
            particleSpriteMap.set(obj, sprite);
        }

        if (!isOnScreen(screenX, screenY, obj.width, obj.height)) {
            sprite.visible = false;
            continue;
        }

        const texture: PIXI.Texture | undefined = drawing.texture(obj);
        if (!texture) {
            sprite.visible = false;
            continue;
        }

        if (sprite.texture !== texture) {
            sprite.texture = texture;
            sprite.width = obj.width;
            sprite.height = obj.height;
        }

        sprite.position.set(screenX, screenY);
        applyLightTint(
            sprite,
            obj.x + obj.width / 2 - originX,
            obj.y + obj.height / 2 - originY,
        );
        sprite.visible = true;
    }
}
