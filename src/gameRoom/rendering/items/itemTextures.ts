import * as PIXI from 'pixi.js';
import { idOfItem } from '../../dropped/itemIds.js';

export const itemTextureUrl_16: string = '/assets/images/games/items/items_16.png';
const itemTextureUrl_32: string = '/assets/images/games/items/items_32.png';

const ITEM_ATLAS_16: Record<string, number> = {
    apple: 0,
    beef: 1,
    chicken: 2,
    iron_axe: 3,
    iron_ingot: 4,
    iron_pickaxe: 5,
    iron_shovel: 6,
    iron_sword: 7,
    mutton: 8,
    oak_door: 9,
    porkchop: 10,
    stick: 11,
    stone_axe: 12,
    stone_shovel: 13,
    stone_sword: 14,
    torch: 15,
    wooden_axe: 16,
    wooden_shovel: 17,
    wooden_sword: 18,
};

const ITEM_ATLAS_32: Record<string, number> = {
    coal: 0,
    raw_iron: 1,
    stone_pickaxe: 2,
    wooden_pickaxe: 3,
};

function sliceAtlas(baseTexture: PIXI.BaseTexture, index: number, frameSize: number): PIXI.Texture {
    const cols: number = Math.floor(baseTexture.width / frameSize);
    const x: number = (index % cols) * frameSize;
    const y: number = Math.floor(index / cols) * frameSize;
    return new PIXI.Texture(baseTexture, new PIXI.Rectangle(x, y, frameSize, frameSize));
}

export const itemTextures: Record<number | string, PIXI.Texture> = {};
export let item_isDrawing: boolean = false;

function main(): void {
    PIXI.Assets.load<Record<string, PIXI.Texture>>([itemTextureUrl_16, itemTextureUrl_32]).then((textures: Record<string, PIXI.Texture>) => {
        initItemTextures(textures);
        item_isDrawing = true;
    }).catch((error: unknown) => {
        console.error('load item textures error', error);
    });
}
main();

function initItemTextures(textures: Record<string, PIXI.Texture>): void {
    const item16Base: PIXI.BaseTexture = textures[itemTextureUrl_16].baseTexture;
    const item32Base: PIXI.BaseTexture = textures[itemTextureUrl_32].baseTexture;

    itemTextures[idOfItem.apple] = sliceAtlas(item16Base, ITEM_ATLAS_16.apple, 16);
    itemTextures[idOfItem.beef] = sliceAtlas(item16Base, ITEM_ATLAS_16.beef, 16);
    itemTextures[idOfItem.chicken] = sliceAtlas(item16Base, ITEM_ATLAS_16.chicken, 16);
    itemTextures[idOfItem.iron_axe] = sliceAtlas(item16Base, ITEM_ATLAS_16.iron_axe, 16);
    itemTextures[idOfItem.iron_ingot] = sliceAtlas(item16Base, ITEM_ATLAS_16.iron_ingot, 16);
    itemTextures[idOfItem.iron_pickaxe] = sliceAtlas(item16Base, ITEM_ATLAS_16.iron_pickaxe, 16);
    itemTextures[idOfItem.iron_shovel] = sliceAtlas(item16Base, ITEM_ATLAS_16.iron_shovel, 16);
    itemTextures[idOfItem.iron_sword] = sliceAtlas(item16Base, ITEM_ATLAS_16.iron_sword, 16);
    itemTextures[idOfItem.mutton] = sliceAtlas(item16Base, ITEM_ATLAS_16.mutton, 16);
    itemTextures[idOfItem.oak_door] = sliceAtlas(item16Base, ITEM_ATLAS_16.oak_door, 16);
    itemTextures[idOfItem.porkchop] = sliceAtlas(item16Base, ITEM_ATLAS_16.porkchop, 16);
    itemTextures[idOfItem.stick] = sliceAtlas(item16Base, ITEM_ATLAS_16.stick, 16);
    itemTextures[idOfItem.stone_axe] = sliceAtlas(item16Base, ITEM_ATLAS_16.stone_axe, 16);
    itemTextures[idOfItem.stone_shovel] = sliceAtlas(item16Base, ITEM_ATLAS_16.stone_shovel, 16);
    itemTextures[idOfItem.stone_sword] = sliceAtlas(item16Base, ITEM_ATLAS_16.stone_sword, 16);
    itemTextures[idOfItem.torch] = sliceAtlas(item16Base, ITEM_ATLAS_16.torch, 16);
    itemTextures[idOfItem.wooden_axe] = sliceAtlas(item16Base, ITEM_ATLAS_16.wooden_axe, 16);
    itemTextures[idOfItem.wooden_shovel] = sliceAtlas(item16Base, ITEM_ATLAS_16.wooden_shovel, 16);
    itemTextures[idOfItem.wooden_sword] = sliceAtlas(item16Base, ITEM_ATLAS_16.wooden_sword, 16);

    itemTextures[idOfItem.coal] = sliceAtlas(item32Base, ITEM_ATLAS_32.coal, 32);
    itemTextures[idOfItem.raw_iron] = sliceAtlas(item32Base, ITEM_ATLAS_32.raw_iron, 32);
    itemTextures[idOfItem.stone_pickaxe] = sliceAtlas(item32Base, ITEM_ATLAS_32.stone_pickaxe, 32);
    itemTextures[idOfItem.wooden_pickaxe] = sliceAtlas(item32Base, ITEM_ATLAS_32.wooden_pickaxe, 32);
}
