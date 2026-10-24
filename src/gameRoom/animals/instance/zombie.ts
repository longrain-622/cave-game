import { player, playerHurt } from '../../player.js';
import { isEnemy, AnimalAttr, Animal, animalArray } from '../animalIds.js';
import { place_meeting } from '../../world.js';

export const zombieAttr: AnimalAttr = { hp: 20, moveSpeed: 1.3, damage: 2 };
const visualRange: number = 8; // 视野
const visualRangePx: number = visualRange * 64;
const SEPARATION_RANGE: number = 64; // 分离生效范围
const SEPARATION_RANGE_SQ: number = SEPARATION_RANGE * SEPARATION_RANGE;
const SEPARATION_WEIGHT: number = 1.5;

export function attackPlayer(entity: Animal, hurt: number): void {
    if (!isEnemy(entity.type)) {return;}
    if (
        Math.abs((player.x + player.width / 2) - (entity.x + entity.width / 2)) <= entity.width &&
        Math.abs((player.y + player.height / 2) - (entity.y + entity.height / 2)) <= entity.height &&
        entity.attackTimer <= 0
    ) {
        entity.attackTimer = 64;
        playerHurt(player, hurt);
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

export function chasePlayer(animal: Animal, delta: number): void {
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
    const newX: number = animal.x + moveDir * animal.movespeed * delta;
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
        animal.legrad += 0.1 * delta;
        if (animal.legrad >= 2 * Math.PI) {animal.legrad = 0;}
    } else {
        if (animal.legrad > 0) {
            animal.legrad -= 0.1 * delta;
            if (animal.legrad < 0) {animal.legrad = 0;}
        } else {
            animal.legrad = 0;
        }
    }
}
