enum idOfAnimal {
    pig = 0, cow, sheep, chicken,
    zombie
}

interface AnimalAttr {
    hp: number;
    moveSpeed: number;
}

const natureAnimals: number[] = [idOfAnimal.pig, idOfAnimal.cow, idOfAnimal.sheep, idOfAnimal.chicken];

// 是否群居
function isSocial(id: number): boolean {
    switch (id) {
        case idOfAnimal.pig: case idOfAnimal.cow:
        case idOfAnimal.chicken: case idOfAnimal.sheep:
            return true;
        default:
            return false;
    }
}

// 是否敌对
function isEnemy(id: number): boolean {
    switch (id) {
        case idOfAnimal.zombie: return true;
        default: return false;
    }
}

export { idOfAnimal, isSocial, isEnemy, AnimalAttr, natureAnimals };
