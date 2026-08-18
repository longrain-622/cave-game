import { getRandomInt } from '../../constants/utils.js';
import { room } from '../../constants/generic.js';
import { player } from '../player.js';

import '../others/audioManager.js';
import { apioxTime } from '../../apiox/time.js';
import { WorldArchive } from '../../types/worldArchive.js';
import { readingWorld, coverWhenSave } from '../gameState.js';
import { natureAnimals, newAnimal, Animal, animalArray } from './animalIds.js';
import { setAnimalList } from './boids.js';
import { animalActions } from './instance/generic.js';
import { initAnimalY } from './instance/generic.js';

const look_range: number = 64; // 渲染的范围的一半

// 加载存档中的动物
function loadAnimals(readingWorld: WorldArchive) {
    if (readingWorld !== null) {
        let animal: Animal;

        for (let i = 0; i < readingWorld.animals.length; i++) {
            const type = readingWorld.animals[i].type;
            const x = readingWorld.animals[i].x;
            const y = readingWorld.animals[i].y;
            const hp = readingWorld.animals[i].hp;

            animal = newAnimal(type, x, y, hp);
            animalArray.push(animal);
        }
    }
}

// 创建实体
function createAnimals(): void {
    let animal: Animal;

    // 删除超出计算范围的实体
    for (let i = 0; i < animalArray.length; i++) {
        if (Math.abs(animalArray[i].x - player.x) >= look_range * 64 ||
            Math.abs(animalArray[i].y - player.y) >= look_range * 64) {
            animalArray.splice(i, 1);
        }
    }

    // 创建新的动物对象
    if (getRandomInt(1, 5) === 3 && animalArray.length < 8) {
        const type: number = natureAnimals[getRandomInt(0, natureAnimals.length - 1)];
        const left: number = getRandomInt(0, 1) * (room.width + 512);
        animal = newAnimal(type, Math.floor(player.x / 64 + room.width / 2 / 64 + 4) * 64 - left, player.y);
        initAnimalY(animal);
        animalArray.push(animal);
    }
}

function main(): void {
    setAnimalList(animalArray); // 注入动物列表供 boids 使用（animalArray 引用不变，只需一次）
    if (coverWhenSave) {loadAnimals(readingWorld);}
    apioxTime.setInt(createAnimals, 2000);
}
main();

export function animalsLoop(): void {
    animalActions();

    // 更新所有动物的闪烁帧数和攻击冷却
    for (let i = 0; i < animalArray.length; i++) {
        if (animalArray[i].flashFrames > 0) {
            animalArray[i].flashFrames--;
        }
        if (animalArray[i].attackTimer > 0) {
            animalArray[i].attackTimer--;
        }
    }
}
