import { player } from "../player.js";
import { Slots } from "../gui/gameGUI/inventoryConfig.js";
import { idOfBlock } from "../nature/blockMecha/blocks.js";
import { isOutOfBounds, setWorldState, world } from "../world.js";
import { mouse } from "../mouse.js";
import { createDrop } from "./droppedItem.js";
import * as PIXI from 'pixi.js';

export enum idOfItem {
    beef = 512, chicken, mutton, porkchop, apple,
    stick, wooden_pickaxe, stone_pickaxe, coal, raw_iron,
    oak_door,
    iron_ingot, iron_pickaxe
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
};

let item_isDrawing: boolean = false;
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

export const itemTextures: Record<number | string, PIXI.Texture> = {};
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
}

function putDoor(doorId: number): void {
    let doorBlockId_b: number;
    let doorBlockId_t: number;

    switch (doorId) {
        case idOfItem.oak_door: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;
    }

    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x) && world[mouse.world_y - 1][mouse.world_x] === idOfBlock.air) {
        setWorldState({ x: mouse.world_x, y: mouse.world_y }, { type: doorBlockId_b });
        setWorldState({ x: mouse.world_x, y: mouse.world_y - 1 }, { type: doorBlockId_t });
    } else {
        createDrop(doorId, mouse.world_x * 64, mouse.world_y * 64);
    }
}

function useItem(item: Slots): Slots { //使用物品栏中的物品
    let plusHp: number = 0;

    switch (item.item) {
        case idOfItem.beef: plusHp = 3; break;
        case idOfItem.chicken: plusHp = 2; break;
        case idOfItem.mutton: plusHp = 2; break;
        case idOfItem.porkchop: plusHp = 3; break;
        case idOfItem.apple: plusHp = 4; break;
        default: plusHp = 0; break;
    }

    if (plusHp !== 0) {
        player.hp += plusHp;
        if (player.hp > 20) {player.hp = 20;}
        item.num--;
    }

    if (item.num <= 0) {return new Slots(-1, 0);}
    else {return item;}
}

export { item_isDrawing, useItem, putDoor };
