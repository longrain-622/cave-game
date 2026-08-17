import { player } from '../player.js';
import { isOnScreen } from '../const.js';
import { animalArray, Animal } from './animals.js';
import { app } from '../rendering.js';
import { idOfAnimal } from './animalIds.js';
import { AnimalParts } from './instance/parts.js';
import { pigTextureUrl, createPigParts } from './instance/pig.js';
import { cowTextureUrl, createCowParts } from './instance/cow.js';
import { sheepTextureUrl, sheepFurTextureUrl, createSheepParts } from './instance/sheep.js';
import { chickenTextureUrl, createChickenParts } from './instance/chicken.js';
import { zombieTextureUrl, createZombieParts, updateZombieLegs } from './instance/zombie.js';
import * as PIXI from 'pixi.js';

export let can_drawEntity: boolean = false;

// 动物贴图加载（URL 由各 instance 模块提供）
const baseTextureList: PIXI.BaseTexture[] = [
    PIXI.BaseTexture.from(pigTextureUrl),
    PIXI.BaseTexture.from(cowTextureUrl),
    PIXI.BaseTexture.from(chickenTextureUrl),
    PIXI.BaseTexture.from(sheepTextureUrl),
    PIXI.BaseTexture.from(sheepFurTextureUrl),
    PIXI.BaseTexture.from(zombieTextureUrl),
];
baseTextureList.forEach((tex: PIXI.BaseTexture): void => {
    tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
});

// 红闪滤镜
const redFilter = new PIXI.ColorMatrixFilter();
redFilter.matrix = [
    1 / 3, 1 / 3, 1 / 3, 0, 80 / 255,
    1 / 6, 1 / 6, 1 / 6, 0, 0,
    0.1, 0.1, 0.1, 0, 0,
    0, 0, 0, 1, 0,
];

// 动物渲染层
const animalLayer: PIXI.Container = new PIXI.Container();
app.stage.addChild(animalLayer);
animalLayer.zIndex = 3.5;

// 各动物部位构建函数（按动物类型分发）
const partBuilders: Record<number, () => AnimalParts> = {
    [idOfAnimal.pig]: createPigParts,
    [idOfAnimal.cow]: createCowParts,
    [idOfAnimal.sheep]: createSheepParts,
    [idOfAnimal.chicken]: createChickenParts,
    [idOfAnimal.zombie]: createZombieParts,
};

let imagesLoaded: number = 0;

// 等所有贴图加载完成后允许绘制
function checkAllLoaded(): void {
    imagesLoaded++;
    if (imagesLoaded !== baseTextureList.length) {return;}
    can_drawEntity = true;
}
baseTextureList.forEach((tex: PIXI.BaseTexture): void => { tex.on('loaded', checkAllLoaded); });

// 每只动物对应的渲染容器（懒创建，动物移除时销毁）
const animalPartsMap: Map<Animal, AnimalParts> = new Map();

function createAnimalParts(animal: Animal): AnimalParts {
    const container: PIXI.Container = new PIXI.Container();
    // pivot 取宽高中心：翻转（scale.x=-1）与死亡旋转（rotation）均绕中心，与原 Canvas2D 变换等价
    container.pivot.set(animal.width / 2, animal.height / 2);
    container.visible = false; // 先隐藏，避免出现在 (0,0)

    // 各动物部位由 instance 模块构建，内部容器置于实体框左上角原点
    const built: AnimalParts = partBuilders[animal.type]();
    container.addChild(built.container);

    animalLayer.addChild(container);
    return { container, leg1: built.leg1, leg2: built.leg2 };
}

function drawAnimals(): void {
    if (!can_drawEntity) {return;}

    // 清理已移除动物的容器
    const aliveAnimals: Set<Animal> = new Set(animalArray);
    for (const [animal, parts] of animalPartsMap) {
        if (aliveAnimals.has(animal)) {continue;}
        animalLayer.removeChild(parts.container);
        parts.container.destroy({ children: true });
        animalPartsMap.delete(animal);
    }

    for (let i = 0; i < animalArray.length; i++) {
        const animal: Animal = animalArray[i];
        const draw_x: number = player.screen_x + animal.x - player.x;
        const draw_y: number = player.screen_y + animal.y - player.y;

        if (!isOnScreen(draw_x, draw_y, animal.width, animal.height)) {
            const offscreenParts: AnimalParts = animalPartsMap.get(animal);
            if (offscreenParts) {offscreenParts.container.visible = false;}
            continue;
        }

        let parts: AnimalParts = animalPartsMap.get(animal);
        if (!parts) {
            parts = createAnimalParts(animal);
            animalPartsMap.set(animal, parts);
        }

        // 位置与变换（死亡旋转在翻转时取负，等价原 Canvas2D "先旋转后翻转" 的变换顺序）
        parts.container.position.set(draw_x + animal.width / 2, draw_y + animal.height / 2);
        parts.container.scale.x = (animal.dir === 1) ? -1 : 1; // 水平翻转
        parts.container.rotation = (animal.hp <= 0) ? ((animal.dir === 1) ? -animal.dierad : animal.dierad) : 0;
        parts.container.visible = true;

        // 腿部摆动：僵尸按玩家方式摆腿，其余动物保持原摆动
        if (animal.type === idOfAnimal.zombie) {
            updateZombieLegs(parts, animal);
        } else {
            const legAngle: number = Math.sin(animal.legrad) / 2;
            if (parts.leg1) {parts.leg1.rotation = legAngle;}
            if (parts.leg2) {parts.leg2.rotation = -legAngle;}
        }

        // 受伤/死亡红闪
        const isFlashing: boolean = (animal.flashFrames > 0 || animal.isDying);
        parts.container.filters = isFlashing ? [redFilter] : [];
    }
}

export { drawAnimals };
