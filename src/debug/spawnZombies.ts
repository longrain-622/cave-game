import { player } from '../gameRoom/player.js';
import { idOfAnimal, animalArray, Animal, newAnimal } from '../gameRoom/animals/animalIds.js';
import { initAnimalY } from '../gameRoom/animals/instance/generic.js';

const spawnEnabled: boolean = false;
const zombieCount: number = 3;
const zombieSpacing: number = 128;

function spawnZombies(): void {
    for (let i = 0; i < zombieCount; i++) {
        const zombie: Animal = newAnimal(idOfAnimal.zombie, player.x + (i - 1) * zombieSpacing, player.y);
        zombie.dir = i % 2 === 0 ? 1 : -1;
        initAnimalY(zombie);
        animalArray.push(zombie);
    }
}

function main(): void {
    if (!spawnEnabled) {return;}
    spawnZombies();
}
main();
