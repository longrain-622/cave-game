import { AnimalAttr } from '../animalIds.js';
import { AnimalParts, AnimalPartDef, buildParts, partDef, subTexture } from './parts.js';
import * as PIXI from 'pixi.js';

export const sheepTextureUrl: string = 'assets/images/games/entity/sheep.png';
export const sheepFurTextureUrl: string = 'assets/images/games/entity/sheep_fur.png';
export const sheepAttr: AnimalAttr = { hp: 8, moveSpeed: 1 };

let sheepPartDefs: AnimalPartDef[] | null = null;

// 羊的部位（坐标相对实体框左上角）
export function createSheepParts(): AnimalParts {
    if (sheepPartDefs === null) {
        const base: PIXI.BaseTexture = PIXI.BaseTexture.from(sheepTextureUrl);
        const furBase: PIXI.BaseTexture = PIXI.BaseTexture.from(sheepFurTextureUrl);
        sheepPartDefs = [
            partDef(subTexture(base, 8, 8, 6, 6), -8, -8, 40, 40), // 身体
            partDef(subTexture(base, 0, 19, 4, 12), 36, 28, 16, 48, 1, 0, 0, 1), // 左腿
            partDef(subTexture(base, 0, 19, 4, 12), 84, 28, 16, 48, 1, 0, 0, 2), // 右腿
            partDef(subTexture(furBase, 36, 14, 6, 16), 32, 32, 32, 64, 0, 0, -Math.PI / 2), // 头
        ];
    }
    return buildParts(sheepPartDefs);
}
