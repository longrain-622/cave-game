import { chickenAttr, pigAttr, cowAttr, sheepAttr } from "./instance/normalAnimal.js";
import { zombieAttr } from './instance/zombie.js';

export enum idOfAnimal {
    pig = 0, cow, sheep, chicken,
    zombie
}

export const animalArray: Animal[] = []; // 用来存储动物实例的数组

export interface Animal {
    type: number;
    x: number; y: number; hp: number;
    width: number, height: number, movespeed: number,
    vsp: number; can_jump: boolean; can_move: boolean; dir: number;
    targetX: number; // 目标点的 x 坐标（像素）
    legrad: number;
    flashFrames: number; // 闪红剩余帧数
    dierad: number; dierad_speed: number; // 死亡时旋转的角度和速度
    isDying: boolean; // 是否正在死亡倒地中
    attackTimer: number; // 攻击玩家的计时器
    doing: number; // 状态 0自然 1追逐玩家
}

export function newAnimal(type: number, x: number, y: number, hp: number = -1): Animal {
    let width: number = 0;
    let height: number = 0;
    let movespeed: number = 1;
    let life: number = 20;

    switch (type) {
        case idOfAnimal.pig: width = 128; break;
        case idOfAnimal.cow: width = 128; break;
        case idOfAnimal.sheep: width = 128; break;
        case idOfAnimal.chicken: width = 64; break;
        case idOfAnimal.zombie: width = 64; break;
        default: width = 0; break;
    }

    switch (type) {
        case idOfAnimal.pig: height = 56; break;
        case idOfAnimal.cow: height = 76; break;
        case idOfAnimal.sheep: height = 76; break;
        case idOfAnimal.chicken: height = 76; break;
        case idOfAnimal.zombie: height = 128; break;
        default: height = 0; break;
    }

    switch (type) {
        case idOfAnimal.chicken:
            movespeed = chickenAttr.moveSpeed;
            break;
        case idOfAnimal.zombie:
            movespeed = zombieAttr.moveSpeed;
            break;
        default:
            movespeed = 1;
            break;
    }

    if (hp === -1) {
        switch (type) {
            case idOfAnimal.pig: life = pigAttr.hp; break;
            case idOfAnimal.cow: life = cowAttr.hp; break;
            case idOfAnimal.sheep: life = sheepAttr.hp; break;
            case idOfAnimal.chicken: life = chickenAttr.hp; break;
            case idOfAnimal.zombie: life = zombieAttr.hp; break;
            default: life = 20; break;
        }
    } else {
        life = hp;
    }

    return {
        type: type,
        x: x, y: y, hp: life,
        vsp: 0, can_jump: false, can_move: false, dir: 0,
        targetX: 0,
        legrad: 0, flashFrames: 0,
        dierad: 0, dierad_speed: 0, isDying: false,
        attackTimer: 0, doing: 0,

        width: width, height: height,
        movespeed: movespeed,
    };
}

export interface AnimalAttr {
    hp: number;
    moveSpeed: number;
    damage?: number; // 攻击伤害（敌意动物使用）
}

export const natureAnimals: number[] = [idOfAnimal.pig, idOfAnimal.cow, idOfAnimal.sheep, idOfAnimal.chicken];

export function isSocial(id: number): boolean { // 是否群居
    switch (id) {
        case idOfAnimal.pig: case idOfAnimal.cow:
        case idOfAnimal.chicken: case idOfAnimal.sheep:
            return true;
        default:
            return false;
    }
}

export function isEnemy(id: number): boolean { // 是否敌对
    switch (id) {
        case idOfAnimal.zombie: return true;
        default: return false;
    }
}
