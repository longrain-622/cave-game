import { entityBlock_array, EntityBlock } from "../entityBlock.js";
import { world , getRandomInt, isOutOfBounds } from "../../const.js";
import { createParticles } from "../../particle.js";
import { createDrop } from "../../dropped/droppedItem.js";
import { idOfBlock } from "./blockMechanism.js";
import { mouse } from "../../mouse.js";
import { lowest_point } from "../createWorld.js";

export function grass_and_dirt(looking_block: number, look_x: number, look_y: number): number {
    if(getRandomInt(0, 256) !== 0 ||
        isOutOfBounds(look_y - 1, look_x - 1) || isOutOfBounds(look_y - 1, look_x + 1) ||
        isOutOfBounds(look_y + 1, look_x - 1) || isOutOfBounds(look_y + 1, look_x + 1)) {
        return looking_block;
    }

    if(looking_block === idOfBlock.grass) { //草方块的性质
        //被覆盖时变成泥土
        if(world[look_y-1][look_x] >= 0) {
            return idOfBlock.dirt; //looking_block的新值
        }
    } else if(looking_block === idOfBlock.dirt) { //泥土的性质
        //旁边是草会长草
        if((world[look_y][look_x-1] === 0 || world[look_y][look_x+1] === 0 ||
            world[look_y-1][look_x-1] === 0 || world[look_y-1][look_x+1] === 0 ||
            world[look_y+1][look_x-1] === 0 || world[look_y+1][look_x+1] === 0)
        && world[look_y-1][look_x] === -1) {
            return idOfBlock.grass;
        }
    }

    return looking_block;
}

export function inviconGrass(looking_block: number, lookx: number, looky: number): number {
    if(looking_block === -3) {
        if(world[looky + 1][lookx] !== 0 && world[looky + 1][lookx] !== 1) {
            for(let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-3, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return -1;
        }
    }

    return looking_block;
}

export function sand_gravity(looking_block: number, look_x: number, look_y: number): number {
    if(looking_block === 5 && world[look_y+1][look_x] <= -1) {
        entityBlock_array.push(new EntityBlock(5, look_x, look_y));
        if(look_y > lowest_point) {return idOfBlock.stone_dark}
        else {return idOfBlock.air}
    }
    return looking_block;
}

export function cactus_and_deadBush(looking_block: number, lookx: number, looky: number): number {
    if(looking_block === -4) {
        if(world[looky + 1][lookx] !== -4 && world[looky + 1][lookx] !== 5) {
            const createX: number = lookx * 64;
            const createY: number = looky * 64;
            for(let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-3, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            }
            createDrop(-4, createX + getRandomInt(0, 64), createY + getRandomInt(0, 64));
            return -1;
        }
    } else if(looking_block === -5) {
        if(world[looky + 1][lookx] === -1) {
            for(let c = 0; c < getRandomInt(16, 32); c++) {
                createParticles(-5, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));
            }
            return -1;
        }
    }
    return looking_block;
}

export function door(looking_block: number, lookx: number, looky: number): number {
    if(isOutOfBounds(looky - 1, lookx) || isOutOfBounds(looky + 1, lookx)) {return looking_block;}

    switch(looking_block) {
        case idOfBlock.oak_door_bottom:
            if(world[looky - 1][lookx] !== idOfBlock.oak_door_top) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top:
            if(world[looky + 1][lookx] !== idOfBlock.oak_door_bottom) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_bottom_open:
            if(world[looky - 1][lookx] !== idOfBlock.oak_door_top_open) {return idOfBlock.air;}
            break;
        case idOfBlock.oak_door_top_open:
            if(world[looky + 1][lookx] !== idOfBlock.oak_door_bottom_open) {return idOfBlock.air;}
            break;
    }

    return looking_block;
}

export function door_openOrClose(): void { //run it when mouseup
    const mouse_x: number = mouse.world_x;
    const mouse_y: number = mouse.world_y;

    switch(world[mouse_y][mouse_x]) {
        case idOfBlock.oak_door_bottom:
            world[mouse_y][mouse_x] = idOfBlock.oak_door_bottom_open;
            world[mouse_y - 1][mouse_x] = idOfBlock.oak_door_top_open;
            break;
        case idOfBlock.oak_door_top:
            world[mouse_y][mouse_x] = idOfBlock.oak_door_top_open;
            world[mouse_y + 1][mouse_x] = idOfBlock.oak_door_bottom_open;
            break;
        case idOfBlock.oak_door_bottom_open:
            world[mouse_y][mouse_x] = idOfBlock.oak_door_bottom;
            world[mouse_y - 1][mouse_x] = idOfBlock.oak_door_top;
            break;
        case idOfBlock.oak_door_top_open:
            world[mouse_y][mouse_x] = idOfBlock.oak_door_top;
            world[mouse_y + 1][mouse_x] = idOfBlock.oak_door_bottom;
            break;
    }
}