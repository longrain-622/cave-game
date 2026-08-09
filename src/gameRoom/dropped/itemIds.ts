import * as PIXI from 'pixi.js';

// 物品 ID 枚举（与贴图资源、加载集中于此模块，供物品系统与配方使用）
export enum idOfItem {
    beef = 512, chicken, mutton, porkchop, apple,
    stick, wooden_pickaxe, stone_pickaxe, coal, raw_iron,
    oak_door,
    iron_ingot, iron_pickaxe,
    wooden_sword, stone_sword, iron_sword,
    wooden_axe, stone_axe, iron_axe,
    wooden_shovel, stone_shovel, iron_shovel,
}

// 物品贴图资源表（alias -> 路径），通过 PixiJS Assets 加载
const itemAssets: Record<string, string> = {
    beef: '/assets/images/games/items/beef.png',
    chicken: '/assets/images/games/items/chicken.png',
    mutton: '/assets/images/games/items/mutton.png',
    porkchop: '/assets/images/games/items/porkchop.png',
    apple: '/assets/images/games/items/apple.png',
    stick: '/assets/images/games/items/stick.png',
    wooden_pickaxe: '/assets/images/games/items/wooden_pickaxe.png',
    stone_pickaxe: '/assets/images/games/items/stone_pickaxe.png',
    coal: '/assets/images/games/items/coal.png',
    raw_iron: '/assets/images/games/items/raw_iron.png',
    oak_door: '/assets/images/games/items/oak_door.png',
    iron_ingot: '/assets/images/games/items/iron_ingot.png',
    iron_pickaxe: '/assets/images/games/items/iron_pickaxe.png',
    wooden_sword: '/assets/images/games/items/wooden_sword.png',
    wooden_axe: '/assets/images/games/items/wooden_axe.png',
    wooden_shovel: '/assets/images/games/items/wooden_shovel.png',
    stone_sword: '/assets/images/games/items/stone_sword.png',
    stone_axe: '/assets/images/games/items/stone_axe.png',
    stone_shovel: '/assets/images/games/items/stone_shovel.png',
    iron_sword: '/assets/images/games/items/iron_sword.png',
    iron_axe: '/assets/images/games/items/iron_axe.png',
    iron_shovel: '/assets/images/games/items/iron_shovel.png',
};

export const itemTextures: Record<number | string, PIXI.Texture> = {};

export let item_isDrawing: boolean = false;
function main(): void {
    // 用 PixiJS Assets 加载物品贴图（替代 Image 对象），全部就绪后再填充 itemTextures
    PIXI.Assets.load<Record<string, PIXI.Texture>>(Object.values(itemAssets)).then((textures: Record<string, PIXI.Texture>) => {
        initItemTextures(toAliasTextures(textures));
        item_isDrawing = true;
    }).catch((error: unknown) => {
        console.error('load item textures error', error);
    });
}
main();

// Assets.load 按 url 返回纹理，转成 alias 索引便于 initItemTextures 使用
function toAliasTextures(textures: Record<string, PIXI.Texture>): Record<string, PIXI.Texture> {
    const byAlias: Record<string, PIXI.Texture> = {};
    for (const [alias, url] of Object.entries(itemAssets)) {
        byAlias[alias] = textures[url];
    }
    return byAlias;
}

function initItemTextures(textures: Record<string, PIXI.Texture>): void {
    itemTextures[idOfItem.beef] = textures['beef'];
    itemTextures[idOfItem.chicken] = textures['chicken'];
    itemTextures[idOfItem.mutton] = textures['mutton'];
    itemTextures[idOfItem.porkchop] = textures['porkchop'];
    itemTextures[idOfItem.apple] = textures['apple'];
    itemTextures[idOfItem.stick] = textures['stick'];
    itemTextures[idOfItem.wooden_pickaxe] = textures['wooden_pickaxe'];
    itemTextures[idOfItem.stone_pickaxe] = textures['stone_pickaxe'];
    itemTextures[idOfItem.coal] = textures['coal'];
    itemTextures[idOfItem.raw_iron] = textures['raw_iron'];
    itemTextures[idOfItem.oak_door] = textures['oak_door'];
    itemTextures[idOfItem.iron_ingot] = textures['iron_ingot'];
    itemTextures[idOfItem.iron_pickaxe] = textures['iron_pickaxe'];
    itemTextures[idOfItem.wooden_sword] = textures['wooden_sword'];
    itemTextures[idOfItem.wooden_axe] = textures['wooden_axe'];
    itemTextures[idOfItem.wooden_shovel] = textures['wooden_shovel'];
    itemTextures[idOfItem.stone_sword] = textures['stone_sword'];
    itemTextures[idOfItem.stone_axe] = textures['stone_axe'];
    itemTextures[idOfItem.stone_shovel] = textures['stone_shovel'];
    itemTextures[idOfItem.iron_sword] = textures['iron_sword'];
    itemTextures[idOfItem.iron_axe] = textures['iron_axe'];
    itemTextures[idOfItem.iron_shovel] = textures['iron_shovel'];
}
