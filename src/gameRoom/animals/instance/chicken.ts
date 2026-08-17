import { AnimalAttr } from '../animalIds.js';
import { AnimalParts, AnimalPartDef, buildParts, partDef, subTexture } from './parts.js';
import * as PIXI from 'pixi.js';

export const chickenTextureUrl: string = 'assets/images/games/entity/chicken.png';
export const chickenAttr: AnimalAttr = { hp: 4, moveSpeed: 1.6 };

let chickenPartDefs: AnimalPartDef[] | null = null;

// 鸡的部位（坐标相对实体框左上角）
export function createChickenParts(): AnimalParts {
    if (chickenPartDefs === null) {
        const base: PIXI.BaseTexture = PIXI.BaseTexture.from(chickenTextureUrl);
        chickenPartDefs = [
            partDef(subTexture(base, 3, 3, 4, 6), 32, 0, 16, 24), // 头
            partDef(subTexture(base, 5, 15, 8, 8), 24, 24, 32, 32), // 身体
            partDef(subTexture(base, 36, 3, 1, 6), 24, 56, 4, 24, 0, 0, 0, 1), // 左腿
            partDef(subTexture(base, 36, 3, 1, 6), 52, 56, 4, 24, 0, 0, 0, 2), // 右腿
            partDef(subTexture(base, 30, 13, 2, 6), 16, 28, 8, 24), // 左翅膀
            partDef(subTexture(base, 30, 13, 2, 6), 56, 28, 8, 24), // 右翅膀
            partDef(subTexture(base, 16, 0, 4, 2), 32, 8, 16, 8), // 鸡冠
        ];
    }
    return buildParts(chickenPartDefs);
}
