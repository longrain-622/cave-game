import { place_meeting, setWorldState, stateWithType } from "../world.js";
import { coverWhenSave, readingWorld } from "../gameState.js";
import { idOfBlock } from "./blockMecha/blocks.js";

export interface EntityBlock {
    id: number;
    world_x: number; world_y: number;
    x: number; y: number; // px
    vsp: number;
    timer: number;
}

export function newEntityBlock(
    id: number,
    world_x: number,
    world_y: number
): EntityBlock {
    return {
        id: id,
        world_x: world_x, world_y: world_y,
        x: world_x * 64, y: world_y * 64,
        vsp: 0,
        timer: 0,
    };
}

export const entityBlock_array: EntityBlock[] = [];

function main(): void {
    // 初始化实体方块数组（读档）
    if (coverWhenSave && readingWorld !== null) {
        for (let i = 0; i < readingWorld.entityBlocks.length; i++) {
            const readEntityBlock = readingWorld.entityBlocks[i];
            const putEntityBlock = newEntityBlock(
                readEntityBlock.id,
                readEntityBlock.world_x,
                readEntityBlock.world_y
            );
            putEntityBlock.vsp = readEntityBlock.vsp;
            putEntityBlock.timer = readEntityBlock.timer;
            entityBlock_array.push(putEntityBlock);
        }
    }
}
main();

function sand_fall(obj: EntityBlock, i: number, delta: number): number {
    obj.vsp += delta;
    obj.y += obj.vsp;

    if (place_meeting(obj.x + 32, obj.y + 64)) {
        const landX: number = Math.floor(obj.x / 64);
        const landY: number = Math.floor(obj.y / 64);
        setWorldState(
            { x: landX, y: landY },
            stateWithType(landX, landY, idOfBlock.sand)
        );

        entityBlock_array.splice(i, 1);
        return i - 1;
    }

    obj.timer += delta; //掉落的沙子到了时间就清除
    if (obj.timer >= 1024) {
        entityBlock_array.splice(i, 1);
        return i - 1;
    }

    return i; // 未移除时返回原索引，避免循环提前终止
}

export function entityBlockLogic(delta: number): void {
    for (let i = 0; i < entityBlock_array.length; i++) {
        const looking: EntityBlock = entityBlock_array[i];
        switch (looking.id) {
            case idOfBlock.sand: i = sand_fall(looking, i, delta); break;
        }
    }
}
