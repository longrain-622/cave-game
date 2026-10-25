export enum idOfItem {
    beef = 512, chicken, mutton, porkchop, apple,
    stick, wooden_pickaxe, stone_pickaxe, coal, raw_iron,
    oak_door,
    iron_ingot, iron_pickaxe,
    wooden_sword, stone_sword, iron_sword,
    wooden_axe, stone_axe, iron_axe,
    wooden_shovel, stone_shovel, iron_shovel,
    torch,
}

export function isTool(id: number): boolean {
    switch (id) {
        case idOfItem.wooden_pickaxe: case idOfItem.wooden_axe: case idOfItem.wooden_sword: case idOfItem.wooden_shovel:
        case idOfItem.stone_pickaxe: case idOfItem.stone_axe: case idOfItem.stone_sword: case idOfItem.stone_shovel:
        case idOfItem.iron_pickaxe: case idOfItem.iron_axe: case idOfItem.iron_sword: case idOfItem.iron_shovel:
            return true;
        default:
            return false;
    }
}
