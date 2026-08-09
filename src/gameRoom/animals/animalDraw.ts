import { player } from '../player.js';
import { isOnScreen } from '../const.js';
import { animalArray, Animal } from './animals.js';
import { app } from '../rendering.js';
import * as PIXI from 'pixi.js';

export let can_drawEntity: boolean = false;

// 动物贴图加载
const baseTextureList: PIXI.BaseTexture[] = [
    PIXI.BaseTexture.from('assets/images/games/entity/pig.png'),
    PIXI.BaseTexture.from('assets/images/games/entity/cow.png'),
    PIXI.BaseTexture.from('assets/images/games/entity/chicken.png'),
    PIXI.BaseTexture.from('assets/images/games/entity/sheep.png'),
    PIXI.BaseTexture.from('assets/images/games/entity/sheep_fur.png'),
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

// 部位定义
interface AnimalPartDef {
    tex: PIXI.Texture;
    x: number; y: number;
    w: number; h: number;
    pivotX: number; pivotY: number;
    rotation: number;
    leg: number; // 0=不摆动 1=左腿 2=右腿
}

interface AnimalParts {
    container: PIXI.Container;
    leg1: PIXI.Sprite | null;
    leg2: PIXI.Sprite | null;
}

let partDefs: AnimalPartDef[][] = [];
let imagesLoaded: number = 0;

// 从基础贴图裁出部位子纹理
function subTexture(base: PIXI.BaseTexture, sx: number, sy: number, sw: number, sh: number): PIXI.Texture {
    return new PIXI.Texture(base, new PIXI.Rectangle(sx, sy, sw, sh));
}

// 构造部位定义（枢轴为纹理本地坐标，随 width/height 缩放；原绘制偏移 (-4,0) 对应 pivot(1,0)）
function partDef(tex: PIXI.Texture, x: number, y: number, w: number, h: number,
    pivotX: number = 0, pivotY: number = 0, rotation: number = 0, leg: number = 0): AnimalPartDef {
    return { tex, x, y, w, h, pivotX, pivotY, rotation, leg };
}

// 等所有贴图加载完成后，生成各动物部位定义
function checkAllLoaded(): void {
    imagesLoaded++;
    if (imagesLoaded !== baseTextureList.length) {return;}

    const [pigBase, cowBase, chickenBase, sheepBase, sheepFurBase] = baseTextureList;

    partDefs = [
        // 猪
        [
            partDef(subTexture(pigBase, 8, 8, 8, 8), -8, -8, 40, 40), // 身体
            partDef(subTexture(pigBase, 17, 17, 4, 3), 2, 12, 20, 15), // 脸
            partDef(subTexture(pigBase, 4, 20, 4, 6), 36, 32, 16, 24, 1, 0, 0, 1), // 左腿
            partDef(subTexture(pigBase, 4, 20, 4, 6), 84, 32, 16, 24, 1, 0, 0, 2), // 右腿
            partDef(subTexture(pigBase, 52, 16, 8, 16), 32, 32, 32, 64, 0, 0, -Math.PI / 2), // 尾巴
        ],
        // 牛
        [
            partDef(subTexture(cowBase, 6, 6, 8, 8), -8, -8, 40, 40), // 身体
            partDef(subTexture(cowBase, 0, 20, 4, 11), 36, 32, 16, 44, 1, 0, 0, 1), // 左腿
            partDef(subTexture(cowBase, 4, 20, 4, 11), 88, 32, 16, 44, 1, 0, 0, 2), // 右腿
            partDef(subTexture(cowBase, 17, 14, 10, 17), 32, 36, 40, 68, 0, 0, -Math.PI / 2), // 头
        ],
        // 羊
        [
            partDef(subTexture(sheepBase, 8, 8, 6, 6), -8, -8, 40, 40), // 身体
            partDef(subTexture(sheepBase, 0, 19, 4, 12), 36, 28, 16, 48, 1, 0, 0, 1), // 左腿
            partDef(subTexture(sheepBase, 0, 19, 4, 12), 84, 28, 16, 48, 1, 0, 0, 2), // 右腿
            partDef(subTexture(sheepFurBase, 36, 14, 6, 16), 32, 32, 32, 64, 0, 0, -Math.PI / 2), // 头
        ],
        // 鸡
        [
            partDef(subTexture(chickenBase, 3, 3, 4, 6), 32, 0, 16, 24), // 头
            partDef(subTexture(chickenBase, 5, 15, 8, 8), 24, 24, 32, 32), // 身体
            partDef(subTexture(chickenBase, 36, 3, 1, 6), 24, 56, 4, 24, 0, 0, 0, 1), // 左腿
            partDef(subTexture(chickenBase, 36, 3, 1, 6), 52, 56, 4, 24, 0, 0, 0, 2), // 右腿
            partDef(subTexture(chickenBase, 30, 13, 2, 6), 16, 28, 8, 24), // 左翅膀
            partDef(subTexture(chickenBase, 30, 13, 2, 6), 56, 28, 8, 24), // 右翅膀
            partDef(subTexture(chickenBase, 16, 0, 4, 2), 32, 8, 16, 8), // 鸡冠
        ],
    ];

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

    let leg1: PIXI.Sprite | null = null;
    let leg2: PIXI.Sprite | null = null;

    for (const def of partDefs[animal.type]) {
        const sprite: PIXI.Sprite = new PIXI.Sprite(def.tex);
        sprite.position.set(def.x, def.y);
        sprite.width = def.w;
        sprite.height = def.h;
        if (def.pivotX !== 0 || def.pivotY !== 0) {
            sprite.pivot.set(def.pivotX, def.pivotY);
        }
        if (def.rotation !== 0) {
            sprite.rotation = def.rotation;
        }
        if (def.leg === 1) {leg1 = sprite;}
        else if (def.leg === 2) {leg2 = sprite;}
        container.addChild(sprite);
    }

    animalLayer.addChild(container);
    return { container, leg1, leg2 };
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

        // 腿部摆动
        const legAngle: number = Math.sin(animal.legrad) / 2;
        if (parts.leg1) {parts.leg1.rotation = legAngle;}
        if (parts.leg2) {parts.leg2.rotation = -legAngle;}

        // 受伤/死亡红闪
        const isFlashing: boolean = (animal.flashFrames > 0 || animal.isDying);
        parts.container.filters = isFlashing ? [redFilter] : [];
    }
}

export { drawAnimals };
