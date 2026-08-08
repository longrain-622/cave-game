import { place_meeting } from "./world.js";
import { getRandomInt, isOnScreen } from "./const.js";
import { player } from "./player.js";
import { checkBlock } from './rendering.js';
import { ctx_entity } from "./animals/animalDraw.js";
import { idOfBlock } from "./nature/blockMecha/blocks.js";

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

let particleArray: Particles[] = []; //存储粒子对象的数组

function createParticles(type: number, x: number, y: number): void {
    particleArray.push(newParticles(type, x, y));
}

function particleAct(): void { // 控制粒子的行为
    for(let i = 0; i < particleArray.length; i++) {
        const particle: Particles = particleArray[i];

        // 删除到时间的
        particle.timer++;
        if (particle.timer >= particle.life) {
            particleArray.splice(i, 1);
            i--;
            continue; // 粒子已删除,跳过本帧的物理计算
        }

        const GRAVITY = 0.5;

        // 应用重力
        particle.vsp += GRAVITY;

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
    for (let k = 0; k < particleArray.length; k++) {
        const obj: Particles = particleArray[k];
        const screenX: number = player.screen_x + obj.x - player.x;
        const screenY: number = player.screen_y + obj.y - player.y;
        if (!isOnScreen(screenX, screenY, obj.width, obj.height)) {continue;}

        let sx: number = 0, sy: number = 0;
        switch (obj.type) {
            case idOfBlock.invicon_grass: case idOfBlock.deadBush: case idOfBlock.chest:
                sx = 8; sy = 12;
                break;
            case idOfBlock.oak_door_bottom: case idOfBlock.oak_door_top: case idOfBlock.oak_door_bottom_open: case idOfBlock.oak_door_top_open:
                sx = 6;
                break;
        }
        checkBlock(ctx_entity, obj.type, screenX, screenY, obj.width, obj.height, sx, sy, Math.round(obj.width / 4), Math.round(obj.height / 4));
    }
}

export { particleArray, drawParticles, particleAct, createParticles };
