import { player } from '../gameRoom/player.js';
import { animalArray, Animal } from '../gameRoom/animals/animals.js';
import { idOfAnimal } from '../gameRoom/animals/animalIds.js';

// 创建世界后默认生成的僵尸参数（调试用）
const spawnEnabled: boolean = false; // 总开关，置 false 可关闭默认生成
const zombieCount: number = 3;
const zombieSpacing: number = 128; // 相邻僵尸的水平间隔（像素）

// 生成 3 只僵尸：本模块由 LoadScripts 在 animals.js 之后导入，
// 而世界（createWorld.js 的 createWorldMain）在更早的加载步骤中已生成完毕，
// 此时 player 坐标与 animalArray 均已就绪
function spawnZombies(): void {
    if (!spawnEnabled) {return;}
    for (let i = 0; i < zombieCount; i++) {
        const zombie: Animal = new Animal(idOfAnimal.zombie, player.x + (i - 1) * zombieSpacing, player.y);
        zombie.dir = i % 2 === 0 ? 1 : -1; // 随机朝向，开始移动后被 beginMove 覆盖
        zombie.setY(); // 落到地表上方，随重力落地
        animalArray.push(zombie);
    }
}

function main(): void {
    if (!spawnEnabled) {return;}
    spawnZombies();
}
main();
