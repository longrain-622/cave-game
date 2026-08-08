import { world, place_meeting } from '../world.js';
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

const look_range: number = 32; //渲染的范围的一半
let animalArray: Animal[] = []; //用来存储动物实例的数组
const entityType_number: number = 4; //目前实体总量

enum idOfAnimal {
    pig = 0, cow, sheep, chicken,
}

// 定义动物类
class Animal {
    type: number;
    x: number; y: number; hp: number;
    vsp: number; can_jump: boolean; can_move: boolean; dir: number;
    legrad: number;
    flashFrames: number; //闪红剩余帧数
    dierad: number; dierad_speed: number; //死亡时旋转的角度和速度
    isDying: boolean;  // 是否正在死亡倒地中

    //精灵的宽高
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
        this.x = x; this.y = y; this.hp = hp;

        this.vsp = vsp; //垂直速度
        this.can_jump = can_jump;
        this.can_move = can_move;
        this.dir = dir; // 方向：-1左 1右

        this.legrad = legrad; //腿的旋转角度
        this.flashFrames = 0; // 初始化闪烁帧数为0
        this.dierad = 0; this.dierad_speed = 0;
        this.isDying = false;
    }

    setY(): void { //初始化y坐标
        let a: number = 0;
        while (world[a][Math.floor(this.x / 64)] === -1) {
            a++;
        }
        this.y = a*64 - 256;
    }

    beginMove(): void { //开始移动
        this.can_move = true;
        this.dir = getRandomInt(2, 4) - 3;
        while (this.dir === 0){this.dir = getRandomInt(2, 4) - 3;}
    }

    injured(wouldJump: boolean, harm: number): void { //动物受伤
        if (wouldJump) {
            this.vsp = -10;
            this.can_jump = false;
        }
        this.beginMove();
        this.hp -= harm;
        this.flashFrames = 8;
    }
}
if (coverWhenSave) {loadAnimals(readingWorld);}

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
apioxTime.setInt(createAnimals, 2000);

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
                    if (!place_meeting(animal.x + animal.width / 2, animal.y + animal.height)) {
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
        if (!place_meeting(animal.x, animal.y + animal.height + 1)) {
            animal.can_jump = false;
        }

        // 移动
        if ((!animal.can_move) && getRandomInt(0, 100) === 50) {
            animal.beginMove();
        }
        if (animal.can_move) {
            if (getRandomInt(0, 180) === 25) {
                animal.can_move = false; // 停止移动
            }

            if (!place_meeting(animal.x + animal.width/2, animal.y + animal.height - 16) &&
                !place_meeting(animal.x + animal.width/2, animal.y + 16)) {
                animal.x += animal.dir;
            } else {
                // 自动跳跃
                if (animal.can_jump) {
                    animal.vsp = -10;
                    animal.can_jump = false;
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
    if (which.isDying) {return;}  // 防止重复调用
    which.isDying = true;
    which.flashFrames = 0;      // 死亡时清除闪红

    //掉落物
    switch (which.type) {
        case idOfAnimal.pig: createDrop(515, which.x, which.y); break;
        case idOfAnimal.cow: createDrop(512, which.x, which.y); break;
        case idOfAnimal.sheep: createDrop(514, which.x, which.y); break;
        case idOfAnimal.chicken: createDrop(513, which.x, which.y); break;
    }
}

apioxEvent.listenGlobal('click', (): void => {
    if (mouse.can_use) { //攻击动物
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
