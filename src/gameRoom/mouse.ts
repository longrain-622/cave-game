import { player } from './player.js';
import { world, distance, getRandomInt, room } from './const.js';
import { inventory, widgets, invenUI_isOpening } from './gui/gameGUI/inventory.js';
import { Slots } from './gui/gameGUI/inventoryConfig.js';
import { createDrop, lookDrops } from './dropped/droppedItem.js';
import { calculateHardness } from './dropped/minetool.js';
import { createParticles } from './particle.js';
import { eventBus } from './others/eventBus.js';
import { soundManager } from './others/soundManager.js';
import { idOfItem, putDoor, useItem } from './dropped/items.js';
import { door_openOrClose } from './nature/blockMecha/bmFunction.js';
import { lowest_point } from './nature/createWorld.js';
import { idOfBlock } from './nature/blockMecha/blockMechanism.js';
import './others/audioManager.js';
import { apioxEvent, ApioxMouseEvent } from '../apiox/event.js';
import { ApioxObject } from '../apiox/dom.js';

const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
let bgmStarted: boolean = false;

//鼠标数据
const mouse: {
    x: number; y: number;
    world_x: number; world_y: number;
    can_use: boolean;
    isDown: boolean; timer: number; destory: number;
    downingButton: number; blockhardness: number;
    last_world_x: number; last_world_y: number;
    last_tool: number; last_targetBlock: number;
} = {
    x: 0, y: 0,
    world_x: 0, world_y: 0, //鼠标在数组中的坐标
    can_use: true, //根据与玩家的距离判断能否挖方块等
    isDown: false, timer: 0, destory: 0, //检测挖方块用的计时器、方块被挖掘的程度
    downingButton: 0,
    blockhardness: 0, //鼠标接触的方块的硬度
    last_world_x: -1, last_world_y: -1,
    last_tool: -1, last_targetBlock: -1,
};

apioxEvent.onMouseMove(
    (event: ApioxMouseEvent): void => {
        gameRoom.getRect();

        const scaleX: number = room.width / gameRoom.getRectWidth(); //内部像素宽/显示宽
        const scaleY: number = room.height / gameRoom.getRectHeight();

        //计算鼠标在 canvas 内部的像素坐标
        mouse.x = (event.clientX - gameRoom.getRectLeft()) * scaleX;
        mouse.y = (event.clientY - gameRoom.getRectTop()) * scaleY;

        if(distance(mouse.x, mouse.y, player.screen_x, player.screen_y) <= 256) {
            mouse.can_use = true;
        } else {mouse.can_use = false;}
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

        //如果 BGM 还没启动，则启动它
        if (!bgmStarted) {
            bgmStarted = true;
            // 启动 BGM，音量设为 0.3
            soundManager.startBGM(0.3).catch(e => console.error('BGM启动失败:', e));
        }
    }
);
apioxEvent.onMouseUp(
    (): void => { //放置方块
        mouse.isDown = false;
        const taking: Slots = inventory.items[widgets.select];

        if(!invenUI_isOpening
        && mouse.can_use
        && mouse.downingButton === 2
        && player.hp > 0) { //方块互动
            door_openOrClose();
        }

        if(!invenUI_isOpening
        && mouse.can_use
        && mouse.downingButton === 2
        && world[mouse.world_y][mouse.world_x] < 0
        && taking.num >= 1
        && player.hp > 0) {
            if(taking.item < 512 || taking.item === idOfItem.oak_door) { //放置
                switch(taking.item) {
                    case idOfItem.oak_door: putDoor(taking.item); break;
                    default: world[mouse.world_y][mouse.world_x] = taking.item; break;
                }
                taking.num -= 1;
                inventory.items[widgets.select] = taking;
                if(inventory.items[widgets.select].num <= 0) {
                    inventory.items[widgets.select] = new Slots(-1, 0);
                }
                eventBus.emit('block:put', taking.item);
            }
            else {
                inventory.items[widgets.select] = useItem(taking);
            }
        }
    }
);

function mouseAct(): void {
    mouse.world_x = Math.round((player.x + mouse.x - player.screen_x) / 64);
    mouse.world_y = Math.round((player.y + mouse.y - player.screen_y) / 64);

    //鼠标挖方块计时器
    if(mouse.isDown && mouse.downingButton === 0 && world[mouse.world_y][mouse.world_x] !== -1) {
        // 检查目标方块是否改变
        if (mouse.last_world_x !== mouse.world_x || mouse.last_world_y !== mouse.world_y
            || mouse.last_tool !== inventory.items[widgets.select].item
            || mouse.last_targetBlock !== world[mouse.world_y][mouse.world_x]
        ) {
            mouse.timer = 0;
            mouse.destory = 0;
            mouse.last_world_x = mouse.world_x;
            mouse.last_world_y = mouse.world_y;
            mouse.last_tool = inventory.items[widgets.select].item;
            mouse.last_targetBlock = world[mouse.world_y][mouse.world_x];

            // 更新硬度
            const blockId = world[mouse.world_y][mouse.world_x];
            mouse.blockhardness = calculateHardness(blockId);
        }

        if(mouse.blockhardness !== -1) {
            mouse.timer++;
            if(mouse.timer > mouse.blockhardness) {
                mouse.timer = 0;
                mouse.destory++;
            }
        }
    }
    else {
        mouse.timer = 0;
        mouse.destory = 0;
    }

    if(!invenUI_isOpening
        && mouse.can_use 
        && player.hp > 0
        && mouse.isDown
        && mouse.downingButton === 0
        && world[mouse.world_y][mouse.world_x] !== -1
        && mouse.blockhardness !== -1
    ) { //挖掘
        if(!player.needRotateHand) {player.needRotateHand = true;}
        if(getRandomInt(0, 16) === 1) {createParticles(world[mouse.world_y][mouse.world_x], mouse.world_x*64 - 8 + getRandomInt(0, 1) * 72, mouse.world_y*64 - 8 + getRandomInt(0, 1) * 72);}

        if(mouse.destory > 9) {
            //挖掘和掉落
            mouse.destory = 0;
            mouse.timer = 0;
            const mine_mousey: number = mouse.world_y, mine_mousex: number = mouse.world_x;
            let targetBlock: number = world[mine_mousey][mine_mousex];
            let dropBlock: number = lookDrops(targetBlock); //决定掉落物类型
            eventBus.emit('block:break', targetBlock);

            //管理粒子生成
            for(let a = 0; a < getRandomInt(16, 32); a++) {
                createParticles(world[mine_mousey][mine_mousex], mine_mousex*64 + getRandomInt(0, 64), mine_mousey*64 + getRandomInt(0, 64));
            }

            createDrop(dropBlock, mine_mousex * 64, mine_mousey * 64); //生成掉落物
            if(mine_mousey > lowest_point) {targetBlock = idOfBlock.stone_dark;} else {targetBlock = idOfBlock.air;}
            world[mine_mousey][mine_mousex] = targetBlock;
        }
    }
}

export { mouse, mouseAct };
