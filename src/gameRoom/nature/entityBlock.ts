import { checkBlock } from "../rendering.js";
import { ctx_entity } from "../animals/animalDraw.js";
import { player } from "../player.js";
import { place_meeting, world } from "../const.js";

class EntityBlock {
    id: number;
    world_x: number; world_y: number;
    x: number; y: number; //px
    vsp: number;
    timer: number;

    constructor(id: number, world_x: number, world_y: number) {
        this.id = id;
        this.world_x = world_x; this.world_y = world_y;
        this.x = world_x * 64; this.y = world_y * 64;
        this.vsp = 0;
        this.timer = 0;
    }
}

let entityBlock_array: EntityBlock[] = [];

function sand_fall(obj: EntityBlock, i: number): number {
    obj.vsp++;
    obj.y += obj.vsp;

    if(place_meeting(obj.x + 32, obj.y + 64)) {
        world[Math.floor(obj.y / 64)][Math.floor(obj.x / 64)] = 5;

        entityBlock_array.splice(i, 1);
        i--;
        return i;
    }

    obj.timer++; //掉落的沙子到了时间就清除
    if(obj.timer >= 1024) {
        entityBlock_array.splice(i, 1);
        i--;
        return i;
    }
}

function look_entityBlock() {
    for(let i = 0; i < entityBlock_array.length; i++) {
        const looking: EntityBlock = entityBlock_array[i];

        checkBlock(ctx_entity, looking.id, player.screen_x + looking.x - player.x, player.screen_y + looking.y - player.y, 64, 64); //绘制实体方块

        switch(looking.id) {
            case 5: i = sand_fall(looking, i); break;
        }
    }
}

export { entityBlock_array, EntityBlock, look_entityBlock };

