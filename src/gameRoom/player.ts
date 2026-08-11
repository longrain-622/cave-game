import { world_height, world, chunk, place_meeting } from './world.js';
import { enableKeyDoubleClickDetection } from './const.js';
import { room } from '../constants/generic.js';
import { uistate } from './gui/uiState.js';
import { mouse } from './mouse.js';
import { eventBus } from './others/eventBus.js';
import { app, blockTextures } from './rendering.js';
import { inventory, widgets } from './gui/gameGUI/inventory.js';
import { WorldArchive } from '../types/worldArchive.js';
import { readingWorld, coverWhenSave } from './gameState.js';
import * as PIXI from 'pixi.js';
import { apioxEvent } from '../apiox/event.js';
import { notNullUndefined } from '../constants/utils.js';
import { idOfBlock } from './nature/blockMecha/blocks.js';
import { isTool, itemTextures } from './dropped/itemIds.js';
import { flipDraw } from './dropped/items.js';

export let can_drawPlayer: boolean = false;
//let playerContainer: PIXI.Container | null = null;

interface PlayerParts {
    container: PIXI.Container | null;
    head: PIXI.Sprite | null;
    body: PIXI.Sprite | null;
    leftArm: PIXI.Sprite | null;
    rightArm: PIXI.Sprite | null;
    leftLeg: PIXI.Sprite | null;
    rightLeg: PIXI.Sprite | null;
    taking: PIXI.Sprite | null;
}

class Players {
    hp: number;
    face: number;
    x: number; y: number;
    screen_x: number; screen_y: number;
    left: number; right: number;
    move_speed: number; acc: number;
    grav: number; jumpspeed: number; vsp: number; can_jump: boolean;
    width: number; height: number;
    leg_rad: number; hand_rad: number; needRotateHand: boolean; isRotateRighthand: boolean;
    rightOnMouse: boolean;
    parts: PlayerParts;

    constructor() {
        this.hp = 20;
        this.face = -1;
        this.x = (world[0].length / 2) * 64;
        this.y = Math.floor(world_height / 2) * 64 - 300;
        this.screen_x = room.width / 2;
        this.screen_y = room.height / 2 - 40;
        this.left = 0; this.right = 0; this.move_speed = 7; this.acc = 0;
        this.grav = 0.5; this.jumpspeed = -10; this.vsp = 0; this.can_jump = false;
        this.width = 64; this.height = 128;
        this.leg_rad = 0; this.hand_rad = 0; this.needRotateHand = false; this.isRotateRighthand = false;
        this.rightOnMouse = false;
        this.parts = this.nullParts();
    }

    private nullParts(): PlayerParts {
        return { container: null, head: null, body: null, leftArm: null, rightArm: null, leftLeg: null, rightLeg: null, taking: null };
    }

    initPlayer(readingWorld: WorldArchive): void {
        if (coverWhenSave && notNullUndefined(readingWorld) && notNullUndefined(readingWorld.player)) {
            this.hp = readingWorld.player.hp;
            this.x = readingWorld.player.x;
            this.y = readingWorld.player.y;
        }
    }

    initXY(): void { // 初始化玩家坐标,在createWorld.js中调用
        this.x = chunk.num * chunk.width * 64 / 2;

        let i: number = 0;
        while (world[i][Math.floor(this.x / 64)] === -1) {i++;}
        this.y = i*64 - 256;
    }

    hurt(howmany: number): void {
        this.hp -= howmany;
        eventBus.emit('player:hurt');
    }
}
const player: Players = new Players();

// 初始化 Pixi 相关资源（应在 Pixi Application 创建后调用）
const baseTexture = PIXI.BaseTexture.from('assets/images/games/player/players.png');
baseTexture.on('loaded', (): void => {
    const headTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(8, 8, 8, 8));
    const bodyTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 20, 8, 12));
    const leftArmTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(44, 20, 4, 12));
    const rightArmTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(36, 52, 4, 12));
    const legTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 52, 4, 12));

    // 头部
    const head = new PIXI.Sprite(headTexture);
    head.width = 32; head.height = 32;
    head.position.set(16, 0);

    // 身体
    const body = new PIXI.Sprite(bodyTexture);
    body.width = 32; body.height = 48;
    body.position.set(16, 32);

    // 左手
    const leftArm = new PIXI.Sprite(leftArmTexture);
    leftArm.width = 16; leftArm.height = 48;
    leftArm.anchor.set(1, 0);
    leftArm.position.set(16, 32);

    // 右手
    const rightArm = new PIXI.Sprite(rightArmTexture);
    rightArm.width = 16; rightArm.height = 48;
    rightArm.anchor.set(0, 0);
    rightArm.position.set(48, 32);

    // 左腿
    const leftLeg = new PIXI.Sprite(legTexture);
    leftLeg.width = 16; leftLeg.height = 48;
    leftLeg.anchor.set(0.5, 0);
    leftLeg.position.set(24, 80);

    // 右腿
    const rightLeg = new PIXI.Sprite(legTexture);
    rightLeg.width = 16; rightLeg.height = 48;
    rightLeg.anchor.set(0.5, 0);
    rightLeg.position.set(40, 80);

    // 热键栏选中的物品（尺寸在 updateTakingItem 中按纹理动态计算，此处不设 width/height）
    const taking = new PIXI.Sprite(PIXI.Texture.EMPTY);
    taking.anchor.set(0.5);
    taking.position.set(0, 60);

    const container = new PIXI.Container();

    container.addChild(head, body, leftArm, rightArm, leftLeg, rightLeg, taking);
    app.stage.addChild(container);
    container.zIndex = 3;

    player.parts = { container, head, body, leftArm, rightArm, leftLeg, rightLeg, taking };
    can_drawPlayer = true;
});

apioxEvent.onKeyDoubleClick((detail) => {
    const key = detail.key;
    if (key === 'a' || key === 'd') {
        player.acc = 3;
    }
});

apioxEvent.onKeyDown((e) => {
    if (uistate.invenUI_isOpening()) {return;}
    switch (e.key) {
        case 'a': player.face = -1; player.left = 1; break;
        case 'd': player.face = 1; player.right = 1; break;
        case 'w': case ' ':
            if (player.can_jump && !uistate.invenUI_isOpening()) {
                player.vsp = player.jumpspeed;
                player.can_jump = false;
            }
            break;
    }
});

apioxEvent.onKeyUp((e) => {
    if (e.key === 'a' || e.key === 'd') {
        player.left = 0; player.right = 0;
        player.acc = 0;
    }
});

apioxEvent.listenGlobal('mousedown', () => {
    if (!uistate.invenUI_isOpening() && mouse.can_use) { // 玩家手部旋转触发
        player.needRotateHand = true;
    }
});

function playerMove(): void { // 玩家移动
    let dir = player.right - player.left;

    if (dir != 0) {
        if (!place_meeting(player.x + player.right * 64, player.y + 120)
        && !place_meeting(player.x + player.right * 64, player.y + 20)) {
            player.x += dir * (player.move_speed + player.acc);
        }
    }

    // 改变玩家腿部旋转方向
    if (player.left === 1 || player.right === 1) {
        player.leg_rad += 0.3 + player.acc / 48;
        if (player.leg_rad >= 2 * Math.PI){player.leg_rad = 0;}
    } else {
        if (player.leg_rad !== 0 && player.leg_rad < 2 * Math.PI) {
            player.leg_rad += 0.3;
            if (player.leg_rad >= 2 * Math.PI) {player.leg_rad = 0;}
        }
    }

    // 改变玩家手旋转方向
    if (player.needRotateHand) {
        if (player.rightOnMouse) {player.isRotateRighthand = true;}
        else {player.isRotateRighthand = false;}

        player.hand_rad += 0.3;
        if (player.hand_rad >= Math.PI) {
            player.needRotateHand = false;
            player.hand_rad = 0;
        }
    } else {
        player.hand_rad = 0;
    }
}

function playerJump(): void { // 玩家跳跃
    player.vsp += player.grav;
    if (player.vsp != 0) {
        for (let i = 0; i < Math.abs(player.vsp); i++) {
            if (player.vsp > 0) {
                if (!(place_meeting(player.x+8, player.y+128) || place_meeting(player.x + 56, player.y + 128))) {
                    player.y++;
                } else {
                    // 计算摔落伤害
                    const fallSpeed = player.vsp;
                    if (fallSpeed > 16) {
                        player.hurt(Math.floor((fallSpeed - 16) / 2));
                    }

                    player.vsp = 0;
                    player.can_jump = true;
                    break;
                }
            } else {
                if (!place_meeting(player.x+32, player.y)) {
                    player.y--;
                } else {
                    player.vsp = 0;
                    break;
                }
            }
        }
    }
    if (!(place_meeting(player.x + 8, player.y + 128) || place_meeting(player.x + 56, player.y + 128))){
        player.can_jump = false;
    }
}

// 手末端偏移向量 (8, 48) 的长度 旋转不改变长度，外推用常量避免每帧开方
const tipLen: number = Math.hypot(8, 48);

// 更新手持物品显示
function updateTakingItem(): void {
    if (!can_drawPlayer || !player.parts || !player.parts.taking) {return;}
    if (inventory.items[widgets.select].item === idOfBlock.air) {
        player.parts.taking.visible = false;
        return;
    }

    const slot = inventory.items[widgets.select];
    const isToolItem: boolean = isTool(slot.item);
    const flipDiag: boolean = flipDraw(slot.item); // 需要沿左下-右上对角线翻转的物品
    let tex: PIXI.Texture | null = null;
    if (slot.item < 512) {tex = blockTextures[slot.item] || null;}
    else {tex = itemTextures[slot.item] || null;}

    if (uistate.invenUI_isOpening() || slot.item === -1 || tex === null) {
        player.parts.taking.visible = false;
        return;
    }
    player.parts.taking.visible = true;
    player.parts.taking.texture = tex;

    // 先赋值纹理再按纹理尺寸算 scale，避免 width/height setter 残留 _width 导致拉伸
    if (isToolItem) {
        // 工具（flipDraw 物品的 scale.x 再取反：对角镜像 = 轴翻转 + 旋转 90°，旋转见下方）
        player.parts.taking.anchor.set(0, 1);
        player.parts.taking.scale.set(
            (player.rightOnMouse ? 1 : -1) * (flipDiag ? -1 : 1) * 48 / tex.orig.width,
            48 / tex.orig.height
        );
    } else {
        // 普通物品
        player.parts.taking.anchor.set(0.5);
        player.parts.taking.scale.set(24 / tex.orig.width, 24 / tex.orig.height);
    }

    // 根据玩家朝向决定物品在哪只手以及旋转
    let armAngle: number = 0;
    if (player.needRotateHand) {
        const handAngle: number = Math.sin(player.hand_rad) / 2;
        if (player.rightOnMouse && player.isRotateRighthand) {armAngle = -handAngle;}
        else if (!player.rightOnMouse && !player.isRotateRighthand) {armAngle = handAngle;}
    }

    // 与手末端中心相对锚点的偏移
    const armX: number = player.rightOnMouse ? 48 : 16;
    const armY: number = 32;
    const tipX: number = player.rightOnMouse ? 8 : -8;
    const tipY: number = 48;

    // 手末端中心（旋转后的位置）
    const dx: number = tipX * Math.cos(armAngle) - tipY * Math.sin(armAngle);
    const dy: number = tipX * Math.sin(armAngle) + tipY * Math.cos(armAngle);
    const handX: number = armX + dx;
    const handY: number = armY + dy;

    if (isToolItem) {
        // 工具末端精确位于手末端中心
        player.parts.taking.position.set(handX, handY);
    } else {
        // 普通物品中心沿手臂方向外推
        const push: number = 4; // 物品中心到手的额外距离
        player.parts.taking.position.set(
            handX + dx / tipLen * push,
            handY + dy / tipLen * push
        );
    }

    // 物品随所在的手一起旋转；flipDraw 物品再沿左下-右上对角线镜像
    // （右手 +90°、左手 -90°，与 scale.x 的所在手翻转组合后左右对称）
    player.parts.taking.rotation = armAngle + (flipDiag ? (player.rightOnMouse ? Math.PI / 2 : -Math.PI / 2) : 0);
}

function updatePlayerRender(): void {
    if (!can_drawPlayer || !player.parts) {return;}
    if (!player.parts.container || !player.parts.leftArm || !player.parts.rightArm || !player.parts.leftLeg || !player.parts.rightLeg) return;

    updateTakingItem();

    player.parts.container.position.set(player.screen_x, player.screen_y);

    // 更新手部旋转
    if (player.needRotateHand) {
        const targetAngle = Math.sin(player.hand_rad) / 2;
        player.parts.leftArm.rotation = player.isRotateRighthand ? 0 : targetAngle;
        player.parts.rightArm.rotation = player.isRotateRighthand ? -targetAngle : 0;
    } else {
        player.parts.leftArm.rotation = 0;
        player.parts.rightArm.rotation = 0;
    }

    // 更新腿部旋转
    const legFactor = 2 - player.acc / 5;
    const legAngle = Math.sin(player.leg_rad) / legFactor;
    player.parts.leftLeg.rotation = -legAngle;
    player.parts.rightLeg.rotation = legAngle;
}

function main(): void {
    baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    player.initPlayer(readingWorld);
    enableKeyDoubleClickDetection();
}
main();

function playerLoop(): void {
    player.rightOnMouse = mouse.x > player.screen_x + player.width / 2;

    // 打开背包无法移动
    if (!uistate.invenUI_isOpening() && player.hp > 0){ 
        playerMove();
    }

    if (player.hp > 0) {playerJump();}

    updatePlayerRender();
}

export { player, playerLoop };