import { AnimalAttr } from '../animalIds.js';
import { AnimalParts, AnimalPartDef, buildParts, partDef, subTexture } from './parts.js';
import * as PIXI from 'pixi.js';

export const pigTextureUrl: string = 'assets/images/games/entity/pig.png';
export const pigAttr: AnimalAttr = { hp: 10, moveSpeed: 1 };

let pigPartDefs: AnimalPartDef[] | null = null;

// 猪的部位（坐标相对实体框左上角）
export function createPigParts(): AnimalParts {
    if (pigPartDefs === null) {
        const base: PIXI.BaseTexture = PIXI.BaseTexture.from(pigTextureUrl);
        pigPartDefs = [
            partDef(subTexture(base, 8, 8, 8, 8), -8, -8, 40, 40), // 身体
            partDef(subTexture(base, 17, 17, 4, 3), 2, 12, 20, 15), // 脸
            partDef(subTexture(base, 4, 20, 4, 6), 36, 32, 16, 24, 1, 0, 0, 1), // 左腿
            partDef(subTexture(base, 4, 20, 4, 6), 84, 32, 16, 24, 1, 0, 0, 2), // 右腿
            partDef(subTexture(base, 52, 16, 8, 16), 32, 32, 32, 64, 0, 0, -Math.PI / 2), // 尾巴
        ];
    }
    return buildParts(pigPartDefs);
}
