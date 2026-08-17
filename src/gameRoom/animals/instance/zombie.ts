import { player } from '../../player.js';
import { isEnemy, AnimalAttr } from '../animalIds.js';
import { Animal } from '../animals.js';
import { AnimalParts, subTexture } from './parts.js';
import * as PIXI from 'pixi.js';

export const zombieTextureUrl: string = 'assets/images/games/entity/zombie.png';
export const zombieAttr: AnimalAttr = { hp: 20, moveSpeed: 1.3 };

// 构造僵尸部位：布局与玩家一致，坐标相对实体框左上角（与 player.ts 相同）
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

// 玩家式摆腿：双腿绕髋关节反向摆动
export function updateZombieLegs(parts: AnimalParts, animal: Animal): void {
    const legAngle: number = Math.sin(animal.legrad) / 2;
    if (parts.leg1) {parts.leg1.rotation = -legAngle;}
    if (parts.leg2) {parts.leg2.rotation = legAngle;}
}

export function attackPlayer(entity: Animal, hurt: number): void {
    if (!isEnemy(entity.type)) {return;}
    if (Math.abs(player.x + player.width / 2 - entity.x + entity.width / 2) <= 128 && entity.attackTimer <= 0) {
        entity.attackTimer = 16;
        player.x -= hurt;
    }
}
