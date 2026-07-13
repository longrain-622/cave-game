import { getRandomInt, isOnScreen, place_meeting } from "./const.js";
import { player } from "./player.js";
import { checkBlock } from './rendering.js';
import { ctx_entity } from "./animals/animalDraw.js";
import { idOfBlock } from "./nature/blockMecha/blockMechanism.js";

class Particles {
    type: number;
    x: number;
    y: number;
    vsp: number;    // 垂直速度
    hsp: number;    // 水平速度
    width: number;
    height: number;
    timer: number;
    life: number;   // 剩余生命周期（帧数）

    constructor(type: number, x: number, y: number) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 2 * getRandomInt(2, 4); //px
        this.height = 2 * getRandomInt(2, 4);

        // 斜抛初速度：水平随机 -3 到 3，垂直向上 -5 到 -3
        this.hsp = getRandomInt(-1, 1);
        this.vsp = getRandomInt(-2, -1);

        this.timer = 0;   // 初始为0，开始计时
    }
}

let particleArray: Particles[] = []; //存储粒子对象的数组

function createParticles(type: number, x: number, y: number): void {
    particleArray.push(new Particles(type, x, y));
}

function particleAct(): void { //控制粒子的行为
    for(let i = 0; i < particleArray.length; i++) {
        const particle = particleArray[i];

        //删除到时间的
        particle.timer++;
        if(particle.timer >= 100 + getRandomInt(0, 32)) {
            particleArray.splice(i, 1);
            i--;
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
        if(!isOnScreen(screenX, screenY, obj.width, obj.height)) {continue;}

        let sx: number = 0; let sy: number = 0;
        switch(obj.type) {
            case idOfBlock.invicon_grass: case idOfBlock.deadBush:
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
