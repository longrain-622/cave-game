import { player } from "../../player.js";
import { BlockPos, world, place_meeting, blockTypeAt } from "../../world.js";
import { point_coll_rect } from "../../const.js";
import { idOfBlock, canOver } from "../../nature/blockMecha/blocks.js";
import { getRandomInt } from "../../../constants/utils.js";
import { isEnemy, idOfAnimal, Animal, animalArray } from "../animalIds.js";
import { findPlayer, chasePlayer } from "./zombie.js";
import { flockDirection } from "../boids.js";
import { mouse } from '../../mouse.js';
import { eventBus } from '../../others/eventBus.js';
import { createDrop } from '../../dropped/droppedItem.js';
import { idOfItem } from "../../dropped/itemIds.js";
import { apioxEvent } from "../../../apiox/event.js";

export function initAnimalY(animal: Animal): void {
    let a: number = 0;
    while (blockTypeAt(Math.floor(animal.x / 64), a) === -1) {
        a++;
    }
    animal.y = a * 64 - 256;
}

export function animalBeginMove(animal: Animal): void { // 开始移动
    const x: number = Math.floor(animal.x / 64);
    const y: number = Math.floor((animal.y + animal.height / 2) / 64);
    const dir: number = flockDirection(animal);
    let target: BlockPos | null = lookForPath(x, y, getRandomInt(3, 8), dir);
    if (target === null && dir !== 0) {
        target = lookForPath(x, y);
    }
    if (target === null) {
        animal.can_move = false;
        return;
    }
    animal.can_move = true;
    animal.targetX = target.x * 64;
    animal.dir = animal.targetX > animal.x ? 1 : -1;
}

export function animalInjured(animal: Animal, wouldJump: boolean, harm: number): void { // 动物受伤
    if (wouldJump) {
        animal.vsp = -10;
        animal.can_jump = false;
    }
    animalBeginMove(animal);
    animal.hp -= harm;
    animal.flashFrames = 8;
}

// 判断某个方块是否可通行
function isWalkable(row: number, col: number): boolean {
    if (row <= idOfBlock.air || row >= world.length) {return false;}
    const rowData: number[] | undefined = world[row];
    if (col <= idOfBlock.air || col >= rowData.length) {return false;}
    return canOver(blockTypeAt(col, row));
}

// 寻找玩家
/*
function lookForPlayer(world_x: number, world_y: number): BlockPos | null {
    let direction: number = 1;
    let currentY: number = world_y;
    const step: number = Math.abs(Math.floor(player.x / 64) - world_x);

    if (Math.floor(player.x / 64) > world_x) { direction = 1; }
    else { direction = -1; }

    let lastX: number = world_x;
    let lastY: number = world_y;

    for (let i = 1; i <= step; i++) {
        const col: number = world_x + direction * i;

        if (isWalkable(currentY, col)) {
            if (!isWalkable(currentY + 1, col)) {
                lastX = col;
                lastY = currentY;
                continue;
            }

            let found: boolean = false;
            const maxFall: number = 8;
            for (let fall = 1; fall <= maxFall; fall++) {
                const row: number = currentY + fall;
                if (!isWalkable(row, col) && isWalkable(row - 1, col)) {
                    currentY = row - 1;
                    found = true;
                    break;
                }
            }
            if (!found) {
                return { x: lastX, y: lastY };
            }
            lastX = col;
            lastY = currentY;
            continue;
        } else {
            if (isWalkable(currentY - 1, col)) {
                currentY--;
                lastX = col;
                lastY = currentY;
                continue;
            } else {
                return { x: lastX, y: lastY };
            }
        }
    }

    return { x: world_x + step * direction, y: currentY };
}
*/

// 寻找待前往的目标点
function lookForPath(world_x: number, world_y: number, step: number = getRandomInt(3, 8), dir: number = 0): BlockPos | null {
    let direction: number = dir;
    if (direction === 0) {
        direction = getRandomInt(0, 1) === 0 ? -1 : 1;
    }

    let currentY: number = world_y;

    for (let i = 1; i <= step; i++) {
        const col: number = world_x + direction * i;

        if (isWalkable(currentY, col)) {
            if (!isWalkable(currentY + 1, col)) {
                continue;
            }
            if (!isWalkable(currentY + 2, col)) {
                currentY++;
                continue;
            }
            return null;
        } else {
            if (isWalkable(currentY - 1, col)) {
                currentY--;
            } else {
                return null;
            }
        }
    }

    return { x: world_x + step * direction, y: currentY };
}

// 实体的行为
export function animalActions(delta: number): void {
    for (let k = 0; k < animalArray.length; k++) {
        const animal: Animal = animalArray[k];

        // 死亡只更新旋转角度
        if (animal.isDying) {
            if (animal.dierad < Math.PI / 2 - 0.1) {
                animal.dierad_speed = Math.max(0, 0.12 * (1 - animal.dierad / (Math.PI / 2))) * delta;
                animal.dierad += animal.dierad_speed;
            } else {
                animalArray.splice(k, 1); // 移除
                k--;
            }
            continue;
        }

        // 正常逻辑：hp <= 0 时进入死亡
        if (animal.hp <= 0) {
            killAnimal(animal);
            continue;
        }

        // 敌人视野检测玩家
        if (isEnemy(animal.type)) {
            findPlayer(animal);
        }

        // 重力检测
        animal.vsp += player.grav * delta;
        if (animal.vsp !== 0) {
            for (let i = 0; i < Math.abs(animal.vsp); i++) {
                if (animal.vsp > 0) {
                    if (!place_meeting(animal.x + 8, animal.y + animal.height) &&
                        !place_meeting(animal.x + animal.width / 2, animal.y + animal.height) &&
                        !place_meeting(animal.x + animal.width - 8, animal.y + animal.height)) {
                        animal.y += 1;
                    } else {
                        const fallSpeed = animal.vsp;
                        if (fallSpeed > 12) {
                            animalInjured(animal, false, Math.floor((fallSpeed - 12) / 2));
                        }

                        animal.vsp = 0;
                        animal.can_jump = true;
                        break;
                    }
                } else {
                    if (!place_meeting(animal.x + animal.width / 2, animal.y)) {
                        animal.y -= 1;
                    } else {
                        animal.vsp = 0;
                        break;
                    }
                }
            }
        }
        if (!place_meeting(animal.x + 8, animal.y + animal.height + 1) &&
            !place_meeting(animal.x + animal.width / 2, animal.y + animal.height + 1) &&
            !place_meeting(animal.x + animal.width - 8, animal.y + animal.height + 1)) {
            animal.can_jump = false;
        }

        // 移动
        if (animal.doing === 1) {
            chasePlayer(animal, delta);
        } else if ((!animal.can_move) && getRandomInt(0, 100) === 50) {
            animalBeginMove(animal);
        }
        if (animal.can_move) {
            // 到达目标点则停下，等待下一次指定目标
            if ((animal.dir > 0 && animal.x >= animal.targetX) ||
                (animal.dir < 0 && animal.x <= animal.targetX)) {
                animal.can_move = false;
            } else {
                // 检测墙体
                const frontX: number = animal.x + (animal.dir > 0 ? animal.width : 0);
                if (!place_meeting(frontX, animal.y + animal.height - 16) &&
                    !place_meeting(frontX, animal.y + 16)) {
                    animal.x += animal.dir * animal.movespeed * delta;
                } else {
                    /*
                        被墙挡住：前方是 1 格高的矮墙才跳（80 = 检测点 16 + 一格 64），
                        高墙则停止移动，等随机换向后自行离开，避免原地反复起跳；
                        空中被挡（跳跃途中）不强行停止，否则会跳到一半被截停落回原地
                    */
                    if (animal.can_jump && !place_meeting(frontX, animal.y + animal.height - 80)) {
                        animal.vsp = -10;
                        animal.can_jump = false;
                    } else if (animal.can_jump) {
                        animal.can_move = false;
                    }
                }
            }

            // 改变腿部旋转方向
            animal.legrad += 0.1 * delta;
            if (animal.legrad >= 2 * Math.PI){animal.legrad = 0;}
        } else {
            if (animal.legrad !== 0 && animal.legrad < 2 * Math.PI) {
                animal.legrad += 0.1 * delta;
                if (animal.legrad >= 2 * Math.PI) {animal.legrad = 0;}
            }
        }
    }
}

function killAnimal(which: Animal): void {
    if (which.isDying) {return;} // 防止重复调用
    which.isDying = true;
    which.flashFrames = 0; // 死亡时清除闪红

    // 掉落物
    switch (which.type) {
        case idOfAnimal.pig: createDrop(idOfItem.porkchop, which.x, which.y); break;
        case idOfAnimal.cow: createDrop(idOfItem.beef, which.x, which.y); break;
        case idOfAnimal.sheep: createDrop(idOfItem.mutton, which.x, which.y); break;
        case idOfAnimal.chicken: createDrop(idOfItem.chicken, which.x, which.y); break;
    }
}

apioxEvent.listenGlobal('click', (): void => {
    if (mouse.can_use) { // 攻击动物
        for (let i = 0; i < animalArray.length; i++) {
            const animal = animalArray[i];
            if (animal.isDying || animal.hp <= 0) {continue;} // 已死亡不再受攻击

            let target_x = player.screen_x + animal.x - player.x;
            let target_y = player.screen_y + animal.y - player.y;

            if (point_coll_rect(mouse.x, mouse.y, target_x, target_y, animal.width, animal.height)) {
                animalInjured(animal, true, 1);
                eventBus.emit('player:attack');
            }
        }
    }
});