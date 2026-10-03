import { idOfItem } from '../gameRoom/dropped/itemIds.js';
import { inventory } from '../gameRoom/gui/gameGUI/inventory.js';
import { Slots } from '../gameRoom/gui/gameGUI/inventoryConfig.js';
import { player } from '../gameRoom/player.js';
import { apioxEvent } from '../apiox/event.js';
import { idOfAnimal, animalArray, Animal, newAnimal } from '../gameRoom/animals/animalIds.js';
import { initAnimalY } from '../gameRoom/animals/instance/generic.js';
import { clock } from '../gameRoom/nature/sky.js';

interface Enable {
    spawnZombie: boolean;
    goUnderCave: boolean;
    getCoal: boolean;
    selfHarm: boolean;
    controlTimeStream: boolean;
}
const enable: Enable = {
    spawnZombie: false,
    goUnderCave: false,
    getCoal: false,
    selfHarm: false,
    controlTimeStream: false,
};

function spawnZombies(count: number, spacing: number): void {
    for (let i = 0; i < count; i++) {
        const zombie: Animal = newAnimal(idOfAnimal.zombie, player.x + (i - 1) * spacing, player.y);
        zombie.dir = i % 2 === 0 ? 1 : -1;
        initAnimalY(zombie);
        animalArray.push(zombie);
    }
}

function goToUnderCave(): void {
    player.y = 250 * 64;
    inventory.items[0] = new Slots(idOfItem.iron_pickaxe, 1);
}

function getCoal(): void {
    inventory.items[0] = new Slots(idOfItem.coal, 64);
}

function registerTimeStream(): void {
    apioxEvent.onKeyDown((ev): void => {
        if (ev.key !== 't') {return;}
        clock.timer += 200;
    });
}

function main(): void {
    if (enable.spawnZombie) {
        const zombieCount: number = 3;
        const zombieSpacing: number = 128;
        spawnZombies(zombieCount, zombieSpacing);
    }

    if (enable.goUnderCave) {
        apioxEvent.onKeyDown((e) => {
            if (e.key !== 't') {return;}
            goToUnderCave();
        });
    }

    if (enable.getCoal) {
        getCoal();
    }

    if (enable.selfHarm) {
        apioxEvent.onKeyDown((ev): void => {
            if (ev.key !== 'h') {return;}
            player.hurt(2);
        });
    }

    if (enable.controlTimeStream) {
        registerTimeStream();
    }
}
main();
