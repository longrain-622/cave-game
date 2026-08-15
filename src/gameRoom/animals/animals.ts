import { world, place_meeting, BlockPos } from '../world.js';
import { getRandomInt, point_coll_rect } from '../const.js';
import { room } from '../../constants/generic.js';
import { player } from '../player.js';
import { mouse } from '../mouse.js';
import { eventBus } from '../others/eventBus.js';
import { createDrop } from '../dropped/droppedItem.js';
import '../others/audioManager.js';
import { apioxTime } from '../../apiox/time.js';
import { apioxEvent } from '../../apiox/event.js';
import { WorldArchive } from '../../types/worldArchive.js';
import { readingWorld, coverWhenSave } from '../gameState.js';
import { idOfItem } from '../dropped/itemIds.js';
import { idOfBlock } from '../nature/blockMecha/blocks.js';
import { idOfAnimal } from './animalIds.js';
import { setAnimalList, flockDirection } from './boids.js';

const look_range: number = 64; // 渲染的范围的一半
let animalArray: Animal[] = []; // 用来存储动物实例的数组
const entityType_number: number = 4; // 目前实体总量

// 定义动物类
class Animal {
    type: number;
    x: number; y: number; hp: number;
    movespeed: number;
    vsp: number; can_jump: boolean; can_move: boolean; dir: number;
    targetX: number; // 目标点的 x 坐标（像素）
    legrad: number;
    flashFrames: number; // 闪红剩余帧数
    dierad: number; dierad_speed: number; // 死亡时旋转的角度和速度
    isDying: boolean;  // 是否正在死亡倒地中

    // 精灵的宽高
    get width() {
        switch (this.type) {
            case idOfAnimal.pig: return 128;
            case idOfAnimal.cow: return 128;
            case idOfAnimal.sheep: return 128;
            case idOfAnimal.chicken: return 64;
            default: return 0;
        }
    }

    get height() {
        switch (this.type) {
            case idOfAnimal.pig: return 56;
            case idOfAnimal.cow: return 76;
            case idOfAnimal.sheep: return 76;
            case idOfAnimal.chicken: return 76;
            default: return 0;
        }
    }

    constructor(type: number, x: number, y: number, hp: number,
        vsp: number = 0, can_jump: boolean = false, can_move: boolean = false, dir: number = 0,
        legrad: number = 0) {
        this.type = type;
        this.x = x; this.y = y;
        this.hp = hp;

        switch (type) {
            case idOfAnimal.chicken:
                this.movespeed = 1.6;
                break;
            default:
                this.movespeed = 1;
                break;
        }

        this.vsp = vsp; // 垂直速度
        this.can_jump = can_jump;
        this.can_move = can_move;
        this.dir = dir; // 方向：-1左 1右
        this.targetX = 0; // 目标点初始化为 0，待 beginMove 时指定

        this.legrad = legrad; // 腿的旋转角度
        this.flashFrames = 0; // 初始化闪烁帧数为0
        this.dierad = 0; this.dierad_speed = 0;
        this.isDying = false;
    }

    setY(): void { // 初始化 y 坐标
        let a: number = 0;
        while (world[a][Math.floor(this.x / 64)] === -1) {
            a++;
        }
        this.y = a * 64 - 256;
    }

    beginMove(): void { // 开始移动：先指定目标点，再朝目标点移动
        const x: number = Math.floor(this.x / 64);
        const y: number = Math.floor((this.y + this.height / 2) / 64);
        // boids 指导移动方向：跟随同类平均方向、往群体中心靠拢、远离太近的同类；
        // 没有同类邻居时返回 0，维持原有的随机方向
        const dir: number = flockDirection(this);
        let target: BlockPos | null = lookForPath(x, y, getRandomInt(3, 8), dir);
        if (target === null && dir !== 0) { // boids 方向被拦路，退回随机方向，避免反复撞墙卡住
            target = lookForPath(x, y);
        }
        if (target === null) { // 周围被拦路，原地等待下次尝试
            this.can_move = false;
            return;
        }
        this.can_move = true;
        this.targetX = target.x * 64;
        this.dir = this.targetX > this.x ? 1 : -1;
    }

    injured(wouldJump: boolean, harm: number): void { // 动物受伤
        if (wouldJump) {
            this.vsp = -10;
            this.can_jump = false;
        }
        this.beginMove();
        this.hp -= harm;
        this.flashFrames = 8;
    }
}

// 加载存档中的动物
function loadAnimals(readingWorld: WorldArchive) {
    if (readingWorld !== null) {
        let newAnimal: Animal;

        for (let i = 0; i < readingWorld.animals.length; i++) {
            const type = readingWorld.animals[i].type;
            const x = readingWorld.animals[i].x;
            const y = readingWorld.animals[i].y;
            const hp = readingWorld.animals[i].hp;

            newAnimal = new Animal(type, x, y, hp);
            animalArray.push(newAnimal);
        }
    }
}

// 创建实体
function createAnimals(): void {
    let newAnimal: Animal;

    if (getRandomInt(1, 5) === 3 && animalArray.length < 8) {
        let type: number = getRandomInt(0, entityType_number - 1);
        let hp: number = 0;
        switch (type) {
            case idOfAnimal.pig: hp = 10; break;
            case idOfAnimal.cow: hp = 10; break;
            case idOfAnimal.sheep: hp = 8; break;
            case idOfAnimal.chicken: hp = 4; break;
        }
        //创建新的动物对象并初始化属性
        newAnimal = new Animal(type, player.x - room.width / 2 - 256 + (getRandomInt(2,3)-2) * (room.width + 512), player.y, hp);
        newAnimal.setY(); //初始化y坐标
        animalArray.push(newAnimal);
    }

    // 删除超出计算范围的实体
    for (let i = 0; i < animalArray.length; i++) {
        if (Math.abs(animalArray[i].x - player.x) >= look_range * 64 ||
            Math.abs(animalArray[i].y - player.y) >= look_range * 64) {
            animalArray.splice(i, 1);
        }
    }
}

// 判断某个方块是否可通行（负数方块不阻挡，与 place_meeting 同规则）
function isWalkable(row: number, col: number): boolean {
    if (row <= idOfBlock.air || row >= world.length) {return false;}
    const rowData: number[] | undefined = world[row];
    if (col <= idOfBlock.air || col >= rowData.length) {return false;}
    return rowData[col] < 0;
}

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
function animalActions(): void {
    for (let k = 0; k < animalArray.length; k++) {
        const animal: Animal = animalArray[k];

        // 如果正在死亡，只更新旋转角度，不执行移动/重力
        if (animal.isDying) {
            if (animal.dierad < Math.PI / 2 - 0.1) {
                // 逐渐减速的旋转速度
                animal.dierad_speed = Math.max(0, 0.12 * (1 - animal.dierad / (Math.PI / 2)));
                animal.dierad += animal.dierad_speed;
            } else {
                // 倒地完成，移除
                animalArray.splice(k, 1);
                k--; // 调整索引
            }
            continue; // 跳过后续移动/重力逻辑
        }

        // 正常逻辑：hp <= 0 时进入死亡
        if (animal.hp <= 0) {
            killAnimal(animal);
            continue;
        }

        // 重力检测
        animal.vsp += player.grav;
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
                            animal.injured(false, Math.floor((fallSpeed - 12) / 2));
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
        if ((!animal.can_move) && getRandomInt(0, 100) === 50) {
            animal.beginMove();
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
                    animal.x += animal.dir * animal.movespeed;
                } else {
                    // 被墙挡住：前方是 1 格高的矮墙才跳（80 = 检测点 16 + 一格 64），
                    // 高墙则停止移动，等随机换向后自行离开，避免原地反复起跳；
                    // 空中被挡（跳跃途中）不强行停止，否则会跳到一半被截停落回原地
                    if (animal.can_jump && !place_meeting(frontX, animal.y + animal.height - 80)) {
                        animal.vsp = -10;
                        animal.can_jump = false;
                    } else if (animal.can_jump) {
                        animal.can_move = false;
                    }
                }
            }

            //改变腿部旋转方向
            animal.legrad += 0.1;
            if (animal.legrad >= 2 * Math.PI){animal.legrad = 0;}
        } else {
            if (animal.legrad !== 0 && animal.legrad < 2 * Math.PI) {
                animal.legrad += 0.1;
                if (animal.legrad >= 2 * Math.PI) {animal.legrad = 0;}
            }
        }
    }
}

function killAnimal(which: Animal): void {
    if (which.isDying) {return;} // 防止重复调用
    which.isDying = true;
    which.flashFrames = 0; // 死亡时清除闪红

    //掉落物
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
                animal.injured(true, 1);
                eventBus.emit('player:attack');
            }
        }
    }
});

function main(): void {
    setAnimalList(animalArray); // 注入动物列表供 boids 使用（animalArray 引用不变，只需一次）
    if (coverWhenSave) {loadAnimals(readingWorld);}
    apioxTime.setInt(createAnimals, 2000);
}
main();

function animalsLoop(): void {
    animalActions();

    // 更新所有动物的闪烁帧数
    for (let i = 0; i < animalArray.length; i++) {
        if (animalArray[i].flashFrames > 0) {
            animalArray[i].flashFrames--;
        }
    }
}

export { animalArray, animalsLoop, Animal };
