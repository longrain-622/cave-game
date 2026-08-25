import { place_meeting } from "./world.js";
import { getRandomInt, isOnScreen } from "./const.js";
import { player } from "./player.js";
import { blockTextures, app } from "./rendering/rendering.js";
import { applyLightTint } from "./rendering/light.js";
import { eventBus } from "./others/eventBus.js";
import { idOfBlock } from "./nature/blockMecha/blocks.js";
import * as PIXI from 'pixi.js';

interface Particles {
    type: number;
    x: number;
    y: number;
    vsp: number; // 垂直速度
    hsp: number; // 水平速度
    width: number;
    height: number;
    timer: number;
    life: number; // 剩余生命周期（帧数）
}

function newParticles(type: number, x: number, y: number): Particles {
    return {
        type: type,
        x: x, y: y,
        vsp: getRandomInt(-2, -1),
        hsp: getRandomInt(-1, 1),
        width: 2 * getRandomInt(2, 4),
        height: 2 * getRandomInt(2, 4),
        timer: 0,
        life: 100 + getRandomInt(0, 32),
    };
}

let particleArray: Particles[] = []; // 存储粒子对象的数组

function createParticles(type: number, x: number, y: number): void {
    particleArray.push(newParticles(type, x, y));
}

const particleLayer: PIXI.Container = new PIXI.Container(); // 粒子渲染层
export let can_drawParticle: boolean = false; // 纹理未就绪时等待
const subTextureCache: Record<string, PIXI.Texture> = {}; // 子纹理缓存：同类型同裁剪区域的粒子共用一张裁剪纹理

// 从方块贴图中裁剪子区域
function getSubTexture(type: number, sx: number, sy: number, sw: number, sh: number): PIXI.Texture | undefined {
    const baseTexture: PIXI.Texture = blockTextures[type];
    if (!baseTexture) {return undefined;}

    const key: string = type + '_' + sx + '_' + sy + '_' + sw + '_' + sh;
    if (!subTextureCache[key]) {
        subTextureCache[key] = new PIXI.Texture(baseTexture.baseTexture, new PIXI.Rectangle(sx, sy, sw, sh));
    }
    return subTextureCache[key];
}

// 每个粒子对应的渲染 Sprite（粒子移除时销毁）
const particleSpriteMap: Map<Particles, PIXI.Sprite> = new Map();

function main(): void {
    app.stage.addChild(particleLayer);
    particleLayer.zIndex = 3.6;

    // 纹理就绪前不绘制
    eventBus.once('textures:ready', () => { can_drawParticle = true; });
}
main();

function particleAct(delta: number): void { // 控制粒子的行为
    for (let i = 0; i < particleArray.length; i++) {
        const particle: Particles = particleArray[i];

        // 删除到时间的
        particle.timer += delta;
        if (particle.timer >= particle.life) {
            particleArray.splice(i, 1);
            i--;
            // 同步销毁对应的渲染 Sprite
            const sprite: PIXI.Sprite = particleSpriteMap.get(particle);
            if (sprite) {
                particleLayer.removeChild(sprite);
                sprite.destroy();
                particleSpriteMap.delete(particle);
            }
            continue; // 粒子已删除,跳过本帧的物理计算
        }

        const GRAVITY = 0.5;

        // 应用重力
        particle.vsp += GRAVITY * delta;

        // 垂直移动（逐像素碰撞）
        if (particle.vsp !== 0) {
            const step = Math.abs(particle.vsp);
            for (let a = 0; a < step; a++) {
                const sign = particle.vsp > 0 ? 1 : -1;
                const nextY = particle.y + sign;
                if (!place_meeting(particle.x + particle.width, nextY + (sign > 0 ? particle.height : 0))) {
                    particle.y = nextY;
                } else {
                    particle.vsp = 0;
                    if (sign > 0) particle.hsp = 0;  // 落地时停止水平移动
                    break;
                }
            }
        }

        // 水平移动（仅当尚未落地时，即仍有水平速度）
        if (particle.hsp !== 0) {
            const step = Math.abs(particle.hsp);
            for (let a = 0; a < step; a++) {
                const sign = particle.hsp > 0 ? 1 : -1;
                const nextX = particle.x + sign;
                if (!place_meeting(nextX + particle.width, particle.y + particle.height)) {
                    particle.x = nextX;
                } else {
                    particle.hsp = 0;
                    break;
                }
            }
        }
    }
}

function drawParticles(): void {
    if (!can_drawParticle) {return;}

    for (let k = 0; k < particleArray.length; k++) {
        const obj: Particles = particleArray[k];
        const screenX: number = player.screen_x + obj.x - player.x;
        const screenY: number = player.screen_y + obj.y - player.y;

        let sprite: PIXI.Sprite = particleSpriteMap.get(obj);
        if (!sprite) {
            sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
            particleLayer.addChild(sprite);
            particleSpriteMap.set(obj, sprite);
        }

        if (!isOnScreen(screenX, screenY, obj.width, obj.height)) {
            sprite.visible = false;
            continue;
        }

        let sx: number = 0, sy: number = 0;
        switch (obj.type) {
            case idOfBlock.invicon_grass: case idOfBlock.deadBush: case idOfBlock.chest:
                sx = 8; sy = 12;
                break;
            case idOfBlock.oak_door_bottom: case idOfBlock.oak_door_top: case idOfBlock.oak_door_bottom_open: case idOfBlock.oak_door_top_open:
                sx = 6;
                break;
        }

        const texture: PIXI.Texture | undefined = getSubTexture(obj.type, sx, sy, Math.round(obj.width / 4), Math.round(obj.height / 4));
        if (!texture) {
            sprite.visible = false; // 无对应贴图（如空气），不绘制
            continue;
        }

        // 纹理与尺寸在粒子生命周期内不变，仅在首次（或纹理变化时）赋值
        if (sprite.texture !== texture) {
            sprite.texture = texture;
            sprite.width = obj.width;
            sprite.height = obj.height;
        }
        sprite.position.set(screenX, screenY);
        applyLightTint(sprite, obj.x + obj.width / 2, obj.y + obj.height / 2);
        sprite.visible = true;
    }
}

export { particleArray, drawParticles, particleAct, createParticles };
