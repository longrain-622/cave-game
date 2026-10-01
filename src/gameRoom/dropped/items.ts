import { player } from "../player.js";
import { idOfItem, itemTextures, item_isDrawing } from './itemIds.js';
export { idOfItem, itemTextures, item_isDrawing };
import { Slots } from "../gui/gameGUI/inventoryConfig.js";
import { idOfBlock } from "../nature/blockMecha/blocks.js";
import { isOutOfBounds, isBlockFold, setWorldState, newBlockState, blockTypeAt, blockStateAt, BlockState } from "../world.js";
import { mouse } from "../mouse.js";
import { createDrop } from "./droppedItem.js";

export function flipDraw(id: number): boolean {
    switch (id) {
        case idOfItem.wooden_axe:
        case idOfItem.stone_axe:
        case idOfItem.iron_axe:
            return true;
        default:
            return false;
    }
}

// 放置规则：原本是深色石则把深色石存进背景层，其余情况保留原背景
function keepBehind(x: number, y: number): number {
    const state: BlockState = blockStateAt(x, y);
    return state.type === idOfBlock.stone_dark ? idOfBlock.stone_dark : state.behind;
}

// 门占的两格同样遵守放置规则
function doorState(x: number, y: number, doorBlockId: number): BlockState {
    return newBlockState(doorBlockId, keepBehind(x, y));
}

export function putDoor(doorId: number): void {
    let doorBlockId_b: number;
    let doorBlockId_t: number;

    switch (doorId) {
        case idOfItem.oak_door: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;
        default: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;
    }

    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x) && blockTypeAt(mouse.world_x, mouse.world_y - 1) === idOfBlock.air) {
        setWorldState({ x: mouse.world_x, y: mouse.world_y }, doorState(mouse.world_x, mouse.world_y, doorBlockId_b));
        setWorldState({ x: mouse.world_x, y: mouse.world_y - 1 }, doorState(mouse.world_x, mouse.world_y - 1, doorBlockId_t));
    } else {
        createDrop(doorId, mouse.world_x * 64, mouse.world_y * 64);
    }
}

// 写入火把状态
function placeTorch(x: number, y: number, direction: number): boolean {
    setWorldState({ x: x, y: y }, newBlockState(idOfBlock.torch, keepBehind(x, y), direction));
    return true;
}

export function putTorch(x: number, y: number): boolean {
    if (!mouse.can_use || isOutOfBounds(y, x) || isBlockFold({ x: x, y: y })) {return false;}
    if (blockTypeAt(x, y) > idOfBlock.air) {return false;}

    if (blockTypeAt(x, y + 1) > idOfBlock.air) {
        return placeTorch(x, y, 2);
    }

    const leftSolid: boolean = blockTypeAt(x - 1, y) > idOfBlock.air;
    const rightSolid: boolean = blockTypeAt(x + 1, y) > idOfBlock.air;
    if (leftSolid && rightSolid) {
        return placeTorch(x, y, player.rightOnMouse ? 0 : 1);
    }
    if (leftSolid) {return placeTorch(x, y, 1);}
    if (rightSolid) {return placeTorch(x, y, 0);}

    if (blockStateAt(x, y).behind !== idOfBlock.air) {
        return placeTorch(x, y, 2);
    }
    return false;
}

export function useItem(item: Slots): Slots { // 使用物品栏中的物品
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
