import { player } from '../player.js';
import { setWorldState, isOutOfBounds, newBlockState, blockStateAt, BlockState } from '../world.js';
import { distance } from '../math.js';
import { room } from '../../constants/generic.js';
import { inventory, widgets } from '../gui/gameGUI/inventory.js';
import { uistate } from '../gui/uiState.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { eventBus } from '../others/eventBus.js';
import { soundManager } from '../others/soundManager.js';
import { idOfItem, putDoor, putTorch, useItem } from '../dropped/items.js';
import { door_openOrClose } from '../nature/blockMecha/bmFunction.js';
import { idOfBlock, canBehind } from '../nature/blockMecha/blocks.js';
import { apioxEvent, ApioxMouseEvent } from '../../apiox/event.js';
import { ApioxObject } from '../../apiox/dom.js';
import { mouse, Mouse } from '../mouse.js';
import { isClient } from '../session.js';

export { mouse };
export type { Mouse };

const gameRoom: ApioxObject = new ApioxObject(null, 'GameRoom');
let bgmStarted: boolean = false;

function onMouseMove(event: ApioxMouseEvent): void {
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

function onMouseDown(event: ApioxMouseEvent): void {
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

function onMouseUp(event: ApioxMouseEvent): void { // 放置方块
    mouse.isDown = false;

    if (event.button !== 2) {return;}
    const taking: Slots = inventory.items[widgets.select];

    if (!uistate.invenUI_isOpening()
    && mouse.can_use
    && player.hp > 0) { // 方块互动
        door_openOrClose(mouse.world_x, mouse.world_y);
    }

    if (!uistate.invenUI_isOpening()
        && taking.num >= 1
        && player.hp > 0
    ) {
        if ((taking.item < 512 || taking.item === idOfItem.oak_door || taking.item === idOfItem.torch)
            && putBlock(taking.item, event.shiftKey)
        ) { // 放置（Shift 放进背景层）
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

function putBlock(item: number, behind: boolean): boolean {
    if (!mouse.can_use || isOutOfBounds(mouse.world_y, mouse.world_x)) {return false;}
    const state: BlockState = blockStateAt(mouse.world_x, mouse.world_y);

    if (behind) {
        if (item >= 512 || state.type === idOfBlock.stone_dark || state.behind !== idOfBlock.air || !canBehind(item)) {return false;}
        setWorldState({ x: mouse.world_x, y: mouse.world_y }, newBlockState(state.type, item, state.direction, state.condition));
        return true;
    }

    // 火把贴背景层放置时四周可以没有实心方块，不走 can_put 的“四邻至少一个非空气”判定
    if (item === idOfItem.torch) {
        return putTorch(mouse.world_x, mouse.world_y, mouse.can_use, player.rightOnMouse);
    }

    if (!mouse.can_put) {return false;}
    if (item === idOfItem.oak_door) {
        putDoor(item, mouse.world_x, mouse.world_y);
        return true;
    }

    const keep: number = state.type === idOfBlock.stone_dark ? idOfBlock.stone_dark : state.behind;
    setWorldState({ x: mouse.world_x, y: mouse.world_y }, newBlockState(item, keep));
    return true;
}

function main(): void {
    if (isClient()) {return;}
    apioxEvent.onMouseMove(onMouseMove);
    apioxEvent.onMouseDown(onMouseDown);
    apioxEvent.onMouseUp(onMouseUp);
}
main();
