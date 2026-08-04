import { player } from "../player.js";
import { Slots } from "../gui/gameGUI/inventoryConfig.js";
import { idOfBlock } from "../nature/blockMecha/blockMechanism.js";
import { isOutOfBounds, world } from "../const.js";
import { mouse } from "../mouse.js";
import { createDrop } from "./droppedItem.js";
import * as PIXI from 'pixi.js';

export enum idOfItem {
    beef = 512, chicken, mutton, porkchop, apple,
    stick, wooden_pickaxe, stone_pickaxe, coal, raw_iron,
    oak_door,
    iron_ingot, iron_pickaxe
}

const img_items = {
    beef: new Image(), chicken: new Image(), mutton: new Image(), porkchop: new Image(),
    apple: new Image(),
    stick: new Image(),
    wooden_pickaxe: new Image(), stone_pickaxe: new Image(),
    coal: new Image(), raw_iron: new Image(),
    oak_door: new Image(),
    iron_ingot: new Image(), iron_pickaxe: new Image()
}
img_items.beef.src = 'assets/images/games/items/beef.png';
img_items.chicken.src = 'assets/images/games/items/chicken.png';
img_items.mutton.src = 'assets/images/games/items/mutton.png';
img_items.porkchop.src = 'assets/images/games/items/porkchop.png';
img_items.apple.src = 'assets/images/games/items/apple.png';
img_items.stick.src = 'assets/images/games/items/stick.png';
img_items.wooden_pickaxe.src = 'assets/images/games/items/wooden_pickaxe.png';
img_items.stone_pickaxe.src = 'assets/images/games/items/stone_pickaxe.png';
img_items.coal.src = 'assets/images/games/items/coal.png';
img_items.raw_iron.src = 'assets/images/games/items/raw_iron.png';
img_items.oak_door.src = 'assets/images/games/items/oak_door.png';
img_items.iron_ingot.src = 'assets/images/games/items/iron_ingot.png';
img_items.iron_pickaxe.src = 'assets/images/games/items/iron_pickaxe.png';

//加载图片
const item_images = [
    img_items.beef, img_items.chicken, img_items.mutton, img_items.porkchop,
    img_items.apple,
    img_items.stick,
    img_items.wooden_pickaxe, img_items.stone_pickaxe,
    img_items.coal, img_items.raw_iron,
    img_items.oak_door,
    img_items.iron_ingot, img_items.iron_pickaxe,
];
let imagesLoaded: number = 0;
let item_isDrawing: boolean = false;
function checkAllLoaded() {
    imagesLoaded++;
    if (imagesLoaded === item_images.length) {
        item_isDrawing = true;
        initItemTextures();
    }
}
item_images.forEach(img => img.addEventListener('load', checkAllLoaded));

export const itemTextures: Record<number | string, PIXI.Texture> = {};
function initItemTextures() {
    itemTextures[idOfItem.beef] = PIXI.Texture.from(img_items.beef);
    itemTextures[idOfItem.chicken] = PIXI.Texture.from(img_items.chicken);
    itemTextures[idOfItem.mutton] = PIXI.Texture.from(img_items.mutton);
    itemTextures[idOfItem.porkchop] = PIXI.Texture.from(img_items.porkchop);
    itemTextures[idOfItem.apple] = PIXI.Texture.from(img_items.apple);
    itemTextures[idOfItem.stick] = PIXI.Texture.from(img_items.stick);
    itemTextures[idOfItem.wooden_pickaxe] = PIXI.Texture.from(img_items.wooden_pickaxe);
    itemTextures[idOfItem.stone_pickaxe] = PIXI.Texture.from(img_items.stone_pickaxe);
    itemTextures[idOfItem.coal] = PIXI.Texture.from(img_items.coal);
    itemTextures[idOfItem.raw_iron] = PIXI.Texture.from(img_items.raw_iron);
    itemTextures[idOfItem.oak_door] = PIXI.Texture.from(img_items.oak_door);
    itemTextures[idOfItem.iron_ingot] = PIXI.Texture.from(img_items.iron_ingot);
    itemTextures[idOfItem.iron_pickaxe] = PIXI.Texture.from(img_items.iron_pickaxe);
}

function checkItem(ctx: CanvasRenderingContext2D, drawingObj: number, x: number, y: number, width: number, height: number, sx=0, sy=0, sw=16, sh=16) {
    /*512=beef 513=chicken 514=mutton 515=porkchop*/
    switch(drawingObj) {
        case idOfItem.beef: ctx.drawImage(img_items.beef, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.chicken: ctx.drawImage(img_items.chicken, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.mutton: ctx.drawImage(img_items.mutton, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.porkchop: ctx.drawImage(img_items.porkchop, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.apple: ctx.drawImage(img_items.apple, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.stick: ctx.drawImage(img_items.stick, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.wooden_pickaxe: sw = 32; sh = 32; ctx.drawImage(img_items.wooden_pickaxe, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.stone_pickaxe: sw = 32; sh = 32; ctx.drawImage(img_items.stone_pickaxe, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.coal: sw = 32; sh = 32; ctx.drawImage(img_items.coal, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.raw_iron: sw = 32; sh = 32; ctx.drawImage(img_items.raw_iron, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.oak_door: ctx.drawImage(img_items.oak_door, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.iron_ingot: ctx.drawImage(img_items.iron_ingot, sx, sy, sw, sh, x, y, width, height); break;
        case idOfItem.iron_pickaxe: sw = 32; sh = 32; ctx.drawImage(img_items.iron_pickaxe, sx, sy, sw, sh, x, y, width, height); break;
    }
}

function putDoor(doorId: number): void {
    let doorBlockId_b: number;
    let doorBlockId_t: number;

    switch(doorId) {
        case idOfItem.oak_door: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;
    }

    if (world[mouse.world_y - 1][mouse.world_x] === idOfBlock.air && (!isOutOfBounds(mouse.world_y - 1, mouse.world_x))) {
        world[mouse.world_y][mouse.world_x] = doorBlockId_b;
        world[mouse.world_y - 1][mouse.world_x] = doorBlockId_t;
    } else {
        createDrop(doorId, mouse.world_x * 64, mouse.world_y * 64);
    }
}

function useItem(item: Slots): Slots { //使用物品栏中的物品
    let plusHp: number = 0;

    switch(item.item) {
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

export { checkItem, item_isDrawing, useItem, putDoor };
