import { player } from './player.js';
import { setWorldState, isOutOfBounds, isBlockFold, newBlockState, blockTypeAt } from './world.js';
import { distance, getRandomInt } from './const.js';
import { room } from '../constants/generic.js';
import { inventory, widgets } from './gui/gameGUI/inventory.js';
import { uistate } from './gui/uiState.js';
import { Slots } from './gui/gameGUI/inventoryConfig.js';
import { createDrop, lookDrops } from './dropped/droppedItem.js';
import { calculateHardness } from './dropped/minetool.js';
import { createParticles } from './particle.js';
import { eventBus } from './others/eventBus.js';
import { soundManager } from './others/soundManager.js';
import { idOfItem, putDoor, useItem } from './dropped/items.js';
import { door_openOrClose } from './nature/blockMecha/bmFunction.js';
import { lowest_point } from './nature/createWorld.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';
import { breakChest } from './gui/gameGUI/blockGUI/chest.js';
import { breakFurnace } from './gui/gameGUI/blockGUI/furnace.js';
import './others/audioManager.js';
import { apioxEvent, ApioxMouseEvent } from '../apiox/event.js';
import { ApioxObject } from '../apiox/dom.js';

const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
let bgmStarted: boolean = false;

//鼠标数据
interface Mouse {
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

apioxEvent.onMouseMove(
    (event: ApioxMouseEvent): void => {
        gameRoom.getRect();

        const rectWidth: number = gameRoom.getRectWidth();
        const rectHeight: number = gameRoom.getRectHeight();
        if (rectWidth <= 0 || rectHeight <= 0) {return;}

        const scaleX: number = room.width / rectWidth; // 内部像素宽/显示宽
        const scaleY: number = room.height / rectHeight;

        // 计算鼠标在 canvas 内部的像素坐标
        mouse.x = (event.clientX - gameRoom.getRectLeft()) * scaleX;
        mouse.y = (event.clientY - gameRoom.getRectTop()) * scaleY;

        if (distance(mouse.x, mouse.y, player.screen_x, player.screen_y) <= 256) {
            mouse.can_use = true;
        } else {
            mouse.can_use = false;
        }
    }
);

apioxEvent.onMouseDown(
    (event: ApioxMouseEvent): void => {
        mouse.isDown = true;
        mouse.downingButton = event.button;
        if (event.button === 0) { //左键
            mouse.timer = 0;
            mouse.destory = 0;
        }

        // 如果 BGM 还没启动，则启动它
        if (!bgmStarted) {
            bgmStarted = true;
            soundManager.startBGM(0.3).catch(e => console.error('cannot start bgm:', e));
        }
    }
);

apioxEvent.onMouseUp(
    (event: ApioxMouseEvent): void => { // 放置方块
        mouse.isDown = false;

        if (event.button !== 2) {return;}
        const taking: Slots = inventory.items[widgets.select];

        if (!uistate.invenUI_isOpening()
        && mouse.can_use
        && player.hp > 0) { // 方块互动
            door_openOrClose();
        }

        if (!uistate.invenUI_isOpening()
            && taking.num >= 1
            && player.hp > 0
        ) {
            if ((taking.item < 512 || taking.item === idOfItem.oak_door) && mouse.can_put) { // 放置
                switch (taking.item) {
                    case idOfItem.oak_door: putDoor(taking.item); break;
                    default: setWorldState({ x: mouse.world_x, y: mouse.world_y }, newBlockState(taking.item)); break;
                }
                taking.num -= 1;
                inventory.items[widgets.select] = taking;
                if (inventory.items[widgets.select].num <= 0) {
                    inventory.items[widgets.select] = new Slots(-1, 0);
                }
                eventBus.emit('block:put', taking.item);
            } else { // 使用物品
                inventory.items[widgets.select] = useItem(taking);
            }
        }
    }
);

// 处理特殊情况的挖掘
function specialMouseBreak(mine_mousex: number, mine_mousey: number) {
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

    //鼠标挖方块计时器
    if (mouse.isDown &&
        mouse.downingButton === 0 &&
        blockTypeAt(mouse.world_x, mouse.world_y) !== idOfBlock.air &&
        !isBlockFold({ x: mouse.world_x, y: mouse.world_y })
    ) {
        // 检查目标方块是否改变
        if (mouse.last_world_x !== mouse.world_x || mouse.last_world_y !== mouse.world_y
            || mouse.last_tool !== inventory.items[widgets.select].item
            || mouse.last_targetBlock !== blockTypeAt(mouse.world_x, mouse.world_y)
        ) {
            mouse.timer = 0;
            mouse.destory = 0;
            mouse.last_world_x = mouse.world_x;
            mouse.last_world_y = mouse.world_y;
            mouse.last_tool = inventory.items[widgets.select].item;
            mouse.last_targetBlock = blockTypeAt(mouse.world_x, mouse.world_y);

            // 更新硬度
            const blockId = blockTypeAt(mouse.world_x, mouse.world_y);
            mouse.blockhardness = calculateHardness(blockId);
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
        && blockTypeAt(mouse.world_x, mouse.world_y) !== -1
        && mouse.blockhardness !== -1
    ) { // 挖掘
        if (!player.needRotateHand) {player.needRotateHand = true;}
        if (getRandomInt(0, 16) === 1) {createParticles(blockTypeAt(mouse.world_x, mouse.world_y), mouse.world_x * 64 - 8 + getRandomInt(0, 1) * 72, mouse.world_y * 64 - 8 + getRandomInt(0, 1) * 72);}

        if (mouse.destory > 9) {
            // 挖掘和掉落
            mouse.destory = 0;
            mouse.timer = 0;
            const mine_mousey: number = mouse.world_y, mine_mousex: number = mouse.world_x;
            let targetBlock: number = blockTypeAt(mine_mousex, mine_mousey);
            let dropBlock: number = lookDrops(targetBlock); // 决定掉落物类型
            eventBus.emit('block:break', targetBlock);

            // 管理粒子生成
            for (let a = 0; a < getRandomInt(16, 32); a++) {
                createParticles(blockTypeAt(mine_mousex, mine_mousey), mine_mousex * 64 + getRandomInt(0, 64), mine_mousey * 64 + getRandomInt(0, 64));
            }

            createDrop(dropBlock, mine_mousex * 64, mine_mousey * 64); // 生成掉落物
            specialMouseBreak(mine_mousex, mine_mousey);
            if (mine_mousey > lowest_point) {targetBlock = idOfBlock.stone_dark;} else {targetBlock = idOfBlock.air;}
            setWorldState({ x: mine_mousex, y: mine_mousey }, newBlockState(targetBlock));
        }
    }
}
