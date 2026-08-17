import { AnimalAttr } from '../animalIds.js';
import { AnimalParts, AnimalPartDef, buildParts, partDef, subTexture } from './parts.js';
import * as PIXI from 'pixi.js';

export const cowTextureUrl: string = 'assets/images/games/entity/cow.png';
export const cowAttr: AnimalAttr = { hp: 10, moveSpeed: 1 };

let cowPartDefs: AnimalPartDef[] | null = null;

// 牛的部位（坐标相对实体框左上角）
export function createCowParts(): AnimalParts {
    if (cowPartDefs === null) {
        const base: PIXI.BaseTexture = PIXI.BaseTexture.from(cowTextureUrl);
        cowPartDefs = [
            partDef(subTexture(base, 6, 6, 8, 8), -8, -8, 40, 40), // 身体
            partDef(subTexture(base, 0, 20, 4, 11), 36, 32, 16, 44, 1, 0, 0, 1), // 左腿
            partDef(subTexture(base, 4, 20, 4, 11), 88, 32, 16, 44, 1, 0, 0, 2), // 右腿
            partDef(subTexture(base, 17, 14, 10, 17), 32, 36, 40, 68, 0, 0, -Math.PI / 2), // 头
        ];
    }
    return buildParts(cowPartDefs);
}
