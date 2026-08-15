enum idOfAnimal {
    pig = 0, cow, sheep, chicken,
}

// 是否为群居动物
function isSocial(id: number): boolean {
    switch (id) {
        case idOfAnimal.pig: case idOfAnimal.cow:
        case idOfAnimal.chicken: case idOfAnimal.sheep:
            return true;
        default:
            return false;
    }
}

export { idOfAnimal, isSocial };
