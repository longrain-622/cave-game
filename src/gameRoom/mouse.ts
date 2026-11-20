// mouse.ts
// 鼠标数据与鼠标作用于世界的纯逻辑。坐标采集在 input/mouseInput.ts，
// 这里不依赖 DOM、输入事件或渲染，可在 Node 中独立运行。
import { player, playerState } from './player.js';
import { setWorldState, isOutOfBounds, isBlockFold, blockTypeAt, blockStateAt, newBlockState, BlockState } from './world.js';
import { getRandomInt } from '../constants/utils.js';
import { inventory, widgets } from './gui/gameGUI/inventory.js';
import { uistate } from './gui/uiState.js';
import { createDrop, lookDrops } from './dropped/droppedItem.js';
import { calculateHardness } from './dropped/minetool.js';
import { createParticles } from './particle.js';
import { eventBusSwitch } from './gameState.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';
import { breakChest } from './gui/gameGUI/blockGUI/chest.js';
import { breakFurnace } from './gui/gameGUI/blockGUI/furnace.js';
import { lowest_point } from './nature/createWorld.js';

// 鼠标数据
export interface Mouse {
    x: number; y: number;
    world_x: number; world_y: number; // 鼠标在数组中的坐标
    can_use: boolean; // 根据与玩家的距离判断能否挖方块等
    can_put: boolean;
    isDown: boolean; timer: number; destory: number; // 检测挖方块用的计时器、方块被挖掘的程度
    downingButton: number; blockhardness: number; // 鼠标接触的方块的硬度
    last_world_x: number; last_world_y: number;
    last_tool: number; last_targetBlock: number;
}

export const mouse: Mouse = {
    x: 0, y: 0,
    world_x: 0, world_y: 0,
    can_use: true,
    can_put: false,
    isDown: false, timer: 0, destory: 0,
    downingButton: 0,
    blockhardness: 0,
    last_world_x: -1, last_world_y: -1,
    last_tool: -1, last_targetBlock: -1,
};

// 处理特殊情况的挖掘
function specialMouseBreak(mine_mousex: number, mine_mousey: number): void {
    breakChest(mine_mousex, mine_mousey);
    breakFurnace(mine_mousex, mine_mousey);
}

export function mouseAct(delta: number): void {
    mouse.world_x = Math.round((player.x + mouse.x - player.screen_x) / 64);
    mouse.world_y = Math.round((player.y + mouse.y - player.screen_y) / 64);

    // 不能在 mousemove 里计算
    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x - 1) && !isOutOfBounds(mouse.world_y + 1, mouse.world_x + 1)) {
        mouse.can_put = (mouse.can_use && (
            blockTypeAt(mouse.world_x - 1, mouse.world_y) !== idOfBlock.air ||
            blockTypeAt(mouse.world_x + 1, mouse.world_y) !== idOfBlock.air ||
            blockTypeAt(mouse.world_x, mouse.world_y - 1) !== idOfBlock.air ||
            blockTypeAt(mouse.world_x, mouse.world_y + 1) !== idOfBlock.air
        ) && blockTypeAt(mouse.world_x, mouse.world_y) <= idOfBlock.air
        && !isBlockFold({ x: mouse.world_x, y: mouse.world_y }));
    } else {
        mouse.can_put = false;
    }

    const state: BlockState = blockStateAt(mouse.world_x, mouse.world_y);
    const mineBehind: boolean = state.type === idOfBlock.air && state.behind !== idOfBlock.air;
    const mineType: number = mineBehind ? state.behind : state.type;

    //鼠标挖方块计时器
    if (mouse.isDown &&
        mouse.downingButton === 0 &&
        mineType !== idOfBlock.air &&
        !isBlockFold({ x: mouse.world_x, y: mouse.world_y })
    ) {
        // 检查目标方块是否改变
        if (mouse.last_world_x !== mouse.world_x || mouse.last_world_y !== mouse.world_y
            || mouse.last_tool !== inventory.items[widgets.select].item
            || mouse.last_targetBlock !== mineType
        ) {
            mouse.timer = 0;
            mouse.destory = 0;
            mouse.last_world_x = mouse.world_x;
            mouse.last_world_y = mouse.world_y;
            mouse.last_tool = inventory.items[widgets.select].item;
            mouse.last_targetBlock = mineType;

            // 更新硬度
            mouse.blockhardness = calculateHardness(
                mineType,
                inventory.items[widgets.select].item,
                inventory.items[widgets.select].mine_speed,
                player.state === playerState.swimming
            );
        }

        if (mouse.blockhardness !== -1) {
            mouse.timer += delta;
            if (mouse.timer > mouse.blockhardness) {
                mouse.timer = 0;
                mouse.destory++;
            }
        }
    } else {
        mouse.timer = 0;
        mouse.destory = 0;
    }

    if (!uistate.invenUI_isOpening()
        && mouse.can_use
        && player.hp > 0
        && mouse.isDown
        && mouse.downingButton === 0
        && mineType !== idOfBlock.air
        && mouse.blockhardness !== -1
    ) { // 挖掘
        if (!player.needRotateHand) {player.needRotateHand = true;}
        if (getRandomInt(0, 16) === 1) {createParticles(mineType, mouse.world_x * 64 - 8 + getRandomInt(0, 1) * 72, mouse.world_y * 64 - 8 + getRandomInt(0, 1) * 72);}

        if (mouse.destory > 9) {
            // 挖掘和掉落
            mouse.destory = 0;
            mouse.timer = 0;
            const mine_mousey: number = mouse.world_y, mine_mousex: number = mouse.world_x;
            const dropBlock: number = lookDrops(mineType); // 决定掉落物类型
            eventBusSwitch.blockBreak.push(mineType); // 破坏音效由事件层在本帧统一播放

            // 管理粒子生成
            for (let a = 0; a < getRandomInt(16, 32); a++) {
                createParticles(mineType, mine_mousex * 64 + getRandomInt(0, 64), mine_mousey * 64 + getRandomInt(0, 64));
            }

            createDrop(dropBlock, mine_mousex * 64, mine_mousey * 64); // 生成掉落物
            specialMouseBreak(mine_mousex, mine_mousey);

            if (mineBehind) { // 挖背景
                setWorldState({ x: mine_mousex, y: mine_mousey }, newBlockState(state.type, idOfBlock.air, state.direction, state.condition));
            } else if (state.behind === idOfBlock.stone_dark) {
                setWorldState({ x: mine_mousex, y: mine_mousey }, newBlockState(idOfBlock.stone_dark));
            } else {
                const leftBlock: number = mine_mousey > lowest_point ? idOfBlock.stone_dark : idOfBlock.air;
                setWorldState({ x: mine_mousex, y: mine_mousey }, newBlockState(leftBlock, state.behind));
            }
        }
    }
}
