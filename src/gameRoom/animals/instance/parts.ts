import * as PIXI from 'pixi.js';

// 实体渲染部位（统一结构：容器 + 左右腿引用，供绘制层使用）
export interface AnimalParts {
    container: PIXI.Container;
    leg1: PIXI.Sprite | null;
    leg2: PIXI.Sprite | null;
}

// 部位定义
export interface AnimalPartDef {
    tex: PIXI.Texture;
    x: number; y: number;
    w: number; h: number;
    pivotX: number; pivotY: number;
    rotation: number;
    leg: number; // 0=不摆动 1=左腿 2=右腿
}

// 从基础贴图裁出部位子纹理
export function subTexture(base: PIXI.BaseTexture, sx: number, sy: number, sw: number, sh: number): PIXI.Texture {
    return new PIXI.Texture(base, new PIXI.Rectangle(sx, sy, sw, sh));
}

// 构造部位定义（枢轴为纹理本地坐标，随 width/height 缩放；原绘制偏移 (-4,0) 对应 pivot(1,0)）
export function partDef(tex: PIXI.Texture, x: number, y: number, w: number, h: number,
    pivotX: number = 0, pivotY: number = 0, rotation: number = 0, leg: number = 0): AnimalPartDef {
    return { tex, x, y, w, h, pivotX, pivotY, rotation, leg };
}

// 按部位定义构建渲染容器（坐标为相对实体框左上角）
export function buildParts(defs: AnimalPartDef[]): AnimalParts {
    const container: PIXI.Container = new PIXI.Container();
    let leg1: PIXI.Sprite | null = null;
    let leg2: PIXI.Sprite | null = null;

    for (const def of defs) {
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

    return { container, leg1, leg2 };
}
