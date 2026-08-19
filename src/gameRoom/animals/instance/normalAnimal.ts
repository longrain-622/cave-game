import { AnimalAttr } from "../animalIds.js";
import { AnimalPartDef, AnimalParts, partDef, subTexture, buildParts } from "./parts.js";
import * as PIXI from "pixi.js";

// 猪的部位
export const pigTextureUrl: string = 'assets/images/games/entity/pig.png';
export const pigAttr: AnimalAttr = { hp: 10, moveSpeed: 1 };
let pigPartDefs: AnimalPartDef[] | null = null;
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

// 牛的部位
export const cowTextureUrl: string = 'assets/images/games/entity/cow.png';
export const cowAttr: AnimalAttr = { hp: 10, moveSpeed: 1 };
let cowPartDefs: AnimalPartDef[] | null = null;
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

// 羊的部位
export const sheepTextureUrl: string = 'assets/images/games/entity/sheep.png';
export const sheepFurTextureUrl: string = 'assets/images/games/entity/sheep_fur.png';
export const sheepAttr: AnimalAttr = { hp: 8, moveSpeed: 1 };
let sheepPartDefs: AnimalPartDef[] | null = null;
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

// 鸡的部位
export const chickenTextureUrl: string = 'assets/images/games/entity/chicken.png';
export const chickenAttr: AnimalAttr = { hp: 4, moveSpeed: 1.6 };
let chickenPartDefs: AnimalPartDef[] | null = null;
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