import { player } from '../../player.js';
import { isEnemy, AnimalAttr, Animal, animalArray } from '../animalIds.js';
import { AnimalParts, subTexture } from './parts.js';
import { place_meeting } from '../../world.js';
import * as PIXI from 'pixi.js';

export const zombieTextureUrl: string = 'assets/images/games/entity/zombie.png';
export const zombieAttr: AnimalAttr = { hp: 20, moveSpeed: 1.3, damage: 2 };
const visualRange: number = 8; // 视野
const visualRangePx: number = visualRange * 64;
const SEPARATION_RANGE: number = 64; // 分离生效范围
const SEPARATION_RANGE_SQ: number = SEPARATION_RANGE * SEPARATION_RANGE;
const SEPARATION_WEIGHT: number = 1.5;

// 构造僵尸部位
export function createZombieParts(): AnimalParts {
    const base: PIXI.BaseTexture = PIXI.BaseTexture.from(zombieTextureUrl);

    // 头
    const head: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 8, 8, 8, 8));
    head.width = 32; head.height = 32;
    head.position.set(16, 0);

    // 身体
    const body: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 20, 20, 8, 12));
    body.width = 32; body.height = 48;
    body.position.set(16, 32);

    // 左臂
    const leftArm: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 44, 20, 4, 12));
    leftArm.width = 16; leftArm.height = 48;
    leftArm.anchor.set(1, 0);
    leftArm.position.set(16, 32);

    // 右臂
    const rightArm: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 44, 20, 4, 12));
    rightArm.width = 16; rightArm.height = 48;
    rightArm.anchor.set(0, 0);
    rightArm.position.set(48, 32);

    // 左腿
    const leftLeg: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 4, 20, 4, 12));
    leftLeg.width = 16; leftLeg.height = 48;
    leftLeg.anchor.set(0.5, 0);
    leftLeg.position.set(24, 80);

    // 右腿
    const rightLeg: PIXI.Sprite = new PIXI.Sprite(subTexture(base, 4, 20, 4, 12));
    rightLeg.width = 16; rightLeg.height = 48;
    rightLeg.anchor.set(0.5, 0);
    rightLeg.position.set(40, 80);

    const container: PIXI.Container = new PIXI.Container();
    container.addChild(head, body, leftArm, rightArm, leftLeg, rightLeg);
    return { container, leg1: leftLeg, leg2: rightLeg };
}

// 摆腿
export function updateZombieLegs(parts: AnimalParts, animal: Animal): void {
    const legAngle: number = Math.sin(animal.legrad) / 2;
    if (parts.leg1) {parts.leg1.rotation = -legAngle;}
    if (parts.leg2) {parts.leg2.rotation = legAngle;}
}

export function attackPlayer(entity: Animal, hurt: number): void {
    if (!isEnemy(entity.type)) {return;}
    if (
        Math.abs((player.x + player.width / 2) - (entity.x + entity.width / 2)) <= entity.width &&
        Math.abs((player.y + player.height / 2) - (entity.y + entity.height / 2)) <= entity.height &&
        entity.attackTimer <= 0
    ) {
        entity.attackTimer = 64;
        player.hurt(hurt);
    }
}

// 发现玩家：在视野范围内转为追逐状态，脱离视野恢复自然状态
export function findPlayer(instance: Animal): void {
    if (Math.abs(instance.x - player.x) <= visualRangePx && Math.abs(instance.y - player.y) <= visualRangePx) {
        instance.doing = 1;
    } else {
        instance.doing = 0;
    }
}

// 同类僵尸的水平分离力
function getSeparation(entity: Animal): number {
    if (animalArray.length < 2) {return 0;}
    let steerX: number = 0;

    for (const other of animalArray) {
        if (other === entity || other.isDying || other.type !== entity.type) {continue;}
        const dx: number = other.x - entity.x;
        const dy: number = other.y - entity.y;
        const distSq: number = dx * dx + dy * dy;

        if (distSq === 0 || distSq > SEPARATION_RANGE_SQ) {continue;}

        const dist: number = Math.sqrt(distSq);
        const push: number = 1 - dist / SEPARATION_RANGE;
        steerX += ((entity.x - other.x) / dist) * push;
    }

    return steerX;
}

export function chasePlayer(animal: Animal): void {
    attackPlayer(animal, zombieAttr.damage ?? 1);

    // 朝向玩家
    const dxToPlayer: number = player.x - animal.x;
    let dirX: number = 0;
    if (Math.abs(dxToPlayer) > 2) {dirX = dxToPlayer > 0 ? 1 : -1;}

    // 分离力
    const sepX: number = getSeparation(animal);
    let dirSep: number = 0;
    if (Math.abs(sepX) > 0.1) {dirSep = sepX > 0 ? 1 : -1;}

    // 叠加
    const finalDir: number = dirX + SEPARATION_WEIGHT * dirSep;
    let moveDir: number = 0;
    if (finalDir > 0.3) moveDir = 1;
    else if (finalDir < -0.3) moveDir = -1;
    else moveDir = 0;

    if (moveDir === 0) {
        animal.can_move = false;
        return;
    }

    animal.dir = moveDir;

    // 水平移动
    const newX: number = animal.x + moveDir * animal.movespeed;
    // 检查移动方向是否撞墙
    const footY: number = animal.y + animal.height - 8;
    const midY: number = animal.y + 32;
    const frontX: number = (moveDir > 0) ? newX + animal.width : newX;
    if (!place_meeting(frontX, footY) && !place_meeting(frontX, midY)) {
        animal.x = newX;
    } else {
        if (animal.can_jump && !place_meeting(frontX, footY - 80)) {
            animal.vsp = -10;
            animal.can_jump = false;
        } else {
            animal.can_move = false;
        }
    }
    animal.can_move = false;

    if (moveDir !== 0) {
        animal.legrad += 0.1;
        if (animal.legrad >= 2 * Math.PI) {animal.legrad = 0;}
    } else {
        if (animal.legrad > 0) {
            animal.legrad -= 0.1;
            if (animal.legrad < 0) {animal.legrad = 0;}
        } else {
            animal.legrad = 0;
        }
    }
}
