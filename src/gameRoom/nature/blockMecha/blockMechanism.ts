import { isOutOfBounds, setWorldState, changePos, BlockPos, newBlockState, blockTypeAt } from '../../world.js';
import {
    sand_gravity,
    cactus_and_deadBush,
    grass_and_dirt,
    inviconGrass,
    door,
    setGrassDirt,
    snowGrass
} from './bmFunction.js';

function lookBlocks(): void { // 检测方块并触发方块的机制
    setGrassDirt();

    if (changePos.length === 0) {return;}

    // 取出本帧要处理的坐标并清空列表（splice 返回被移除元素的副本）
    //（处理过程中 setWorldState 会加入新坐标，留到下帧再处理，避免同帧内无限循环）
    const positions: BlockPos[] = changePos.splice(0);

    for (const pos of positions) {
        if (isOutOfBounds(pos.y, pos.x)) {continue;}
        const { x, y } = pos;
        let looking_block = blockTypeAt(x, y);

        looking_block = grass_and_dirt(looking_block, x, y);
        looking_block = sand_gravity(looking_block, x, y);
        looking_block = inviconGrass(looking_block, x, y);
        looking_block = cactus_and_deadBush(looking_block, x, y);
        looking_block = door(looking_block, x, y);
        looking_block = snowGrass(looking_block, x, y);

        // 只有方块发生变化才写入，否则会反复加入待处理列表导致死循环
        if (looking_block !== blockTypeAt(x, y)) {
            setWorldState({ x, y }, newBlockState(looking_block));
        }
    }
}

export { lookBlocks };
