import { place_meeting, blockTypeAt } from "./world.js";
import { getRandomInt } from "../constants/utils.js";
import { player } from "./player.js";
import { eventBus } from "./others/eventBus.js";
import { idOfBlock } from "./nature/blockMecha/blocks.js";

// Other than the idOfBlock, some special particle type
export enum particleType {
    generic = 512,
    splash,
}

export const splashFrameSize: number = 8;
export const splashFrameCount: number = 4;
const splashSize: number = splashFrameSize * 4;

export interface Particles {
    type: number;
    inited: boolean;
    x: number;
    y: number;
    vsp: number;
    hsp: number;
    width: number;
    height: number;
    timer: number;
    life: number; // 剩余生命周期（帧数）
    frame: number;
}

function newParticles(type: number, x: number, y: number): Particles {
    let frame: number = 0;
    let width: number = 2 * getRandomInt(2, 4);
    let height: number = 2 * getRandomInt(2, 4);
    let life: number = 100 + getRandomInt(0, 32);

    switch (type) {
        case particleType.splash:
            frame = getRandomInt(0, splashFrameCount - 1);
            width = splashSize;
            height = splashSize;
            life = 512;
            break;
    }

    return {
        type: type,
        inited: false,
        x: x,
        y: y,
        vsp: getRandomInt(-2, -1),
        hsp: getRandomInt(-1, 1),
        width: width,
        height: height,
        timer: 0,
        life: life,
        frame: frame,
    };
}

export const particleArray: Particles[] = [];

export function createParticles(type: number, x: number, y: number): void {
    particleArray.push(newParticles(type, x, y));
}

function main(): void {
    eventBus.on('player:fallInWater', (): void => {
        for (let i = 0; i < getRandomInt(16, 32); i++) {
            createParticles(
                particleType.splash,
                player.x + getRandomInt(-32, 32),
                player.y + player.height,
            );
        }
    });
}
main();

function normalBehavior(particle: Particles, delta: number): void {
    const GRAVITY: number = 0.5;
    particle.vsp += GRAVITY * delta; // 应用重力

    // 垂直移动
    if (particle.vsp !== 0) {
        const step: number = Math.abs(particle.vsp);
        for (let a = 0; a < step; a++) {
            const sign: number = particle.vsp > 0 ? 1 : -1;
            const nextY: number = particle.y + sign;
            if (!place_meeting(
                particle.x + particle.width,
                nextY + (sign > 0 ? particle.height : 0),
            )) {
                particle.y = nextY;
            } else {
                particle.vsp = 0;
                if (sign > 0) particle.hsp = 0; // 落地时停止水平移动
                break;
            }
        }
    }

    // 水平移动
    if (particle.hsp !== 0) {
        const step: number = Math.abs(particle.hsp);
        for (let a = 0; a < step; a++) {
            const sign: number = particle.hsp > 0 ? 1 : -1;
            const nextX: number = particle.x + sign;
            if (!place_meeting(nextX + particle.width, particle.y + particle.height)) {
                particle.x = nextX;
            } else {
                particle.hsp = 0;
                break;
            }
        }
    }
}

// 该点是否被实体方块或水占据
function splashHitPoint(x: number, y: number): boolean {
    if (place_meeting(x, y)) {return true;}
    return blockTypeAt(Math.floor(x / 64), Math.floor(y / 64)) === idOfBlock.water;
}

// 水花的前缘是否碰到实体方块或水 只看运动方向那一侧的两个角，
function splashHitEdge(
    particle: Particles,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
): boolean {
    const halfW: number = particle.width / 2;
    const halfH: number = particle.height / 2;
    if (dirY !== 0) {
        const edgeY: number = dirY > 0 ? y + halfH : y - halfH;
        return splashHitPoint(x - halfW, edgeY) || splashHitPoint(x + halfW, edgeY);
    }
    const edgeX: number = dirX > 0 ? x + halfW : x - halfW;
    return splashHitPoint(edgeX, y - halfH) || splashHitPoint(edgeX, y + halfH);
}

// 返回 true 表示碰到实体方块或水，该粒子应当消失
function splashBehavior(particle: Particles, delta: number): boolean {
    if (!particle.inited) {
        particle.vsp = -getRandomInt(8, 16) * delta;
        particle.hsp = getRandomInt(-2, 2) * delta;
        particle.inited = true;
    }

    particle.vsp += delta;

    const dirY: number = Math.sign(particle.vsp);
    let remainingY: number = Math.abs(particle.vsp);
    while (remainingY > 0) {
        const stepY: number = Math.min(1, remainingY);
        const nextY: number = particle.y + dirY * stepY;
        if (splashHitEdge(particle, particle.x, nextY, 0, dirY)) {return true;}
        particle.y = nextY;
        remainingY -= stepY;
    }

    const dirX: number = Math.sign(particle.hsp);
    let remainingX: number = Math.abs(particle.hsp);
    while (remainingX > 0) {
        const stepX: number = Math.min(1, remainingX);
        const nextX: number = particle.x + dirX * stepX;
        if (splashHitEdge(particle, nextX, particle.y, dirX, 0)) {return true;}
        particle.x = nextX;
        remainingX -= stepX;
    }

    return false;
}

// 从粒子数组移除一个粒子
function removeParticles(index: number): void {
    particleArray.splice(index, 1);
}

export function particleAct(delta: number): void { // 控制粒子的行为
    for (let i = 0; i < particleArray.length; i++) {
        const particle: Particles = particleArray[i];

        particle.timer += delta;
        if (particle.timer >= particle.life) {
            removeParticles(i); // 删除到时间的
            i--;
            continue;
        }

        switch (particle.type) {
            case particleType.splash:
                if (splashBehavior(particle, delta)) {
                    removeParticles(i);
                    i--;
                }
                break;
            default:
                normalBehavior(particle, delta);
                break;
        }
    }
}
