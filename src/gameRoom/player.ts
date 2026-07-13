import { world_height, room, world, chunk, place_meeting, enableKeyDoubleClickDetection } from './const.js';
import { invenUI_isOpening } from './gui/gameGUI/inventory.js';
import { mouse } from './mouse.js';
import { app } from './rendering.js';
import { eventBus } from './others/eventBus.js';
import './others/audioManager.js';
import * as PIXI from 'pixi.js';
import { apioxEvent } from '../apiox/event.js';

// 原有的 canvas 绘制变量不再需要，改为 Pixi 容器
export let can_drawPlayer: boolean = false;
let playerContainer: PIXI.Container;

// 预定义各部位的纹理
let headTexture: PIXI.Texture;
let bodyTexture: PIXI.Texture;
let leftArmTexture: PIXI.Texture;
let rightArmTexture: PIXI.Texture;
let legTexture: PIXI.Texture;

// 各部位精灵
let head: PIXI.Sprite;
let body: PIXI.Sprite;
let leftArm: PIXI.Sprite;
let rightArm: PIXI.Sprite;
let leftLeg: PIXI.Sprite;
let rightLeg: PIXI.Sprite;

// 初始化 Pixi 相关资源（应在 Pixi Application 创建后调用）
export function initPlayerPixi(stage: PIXI.Container) {
    const baseTexture = PIXI.BaseTexture.from('assets/images/games/player/players.png');
    baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    
    baseTexture.on('loaded', () => {
        headTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(8, 8, 8, 8));
        bodyTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 20, 8, 12));
        leftArmTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(44, 20, 4, 12));
        rightArmTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(36, 52, 4, 12));
        legTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 52, 4, 12));

        playerContainer = new PIXI.Container();

        // 头部
        head = new PIXI.Sprite(headTexture);
        head.width = 32; head.height = 32;
        head.position.set(16, 0);

        // 身体
        body = new PIXI.Sprite(bodyTexture);
        body.width = 32; body.height = 48;
        body.position.set(16, 32);

        // 左手
        leftArm = new PIXI.Sprite(leftArmTexture);
        leftArm.width = 16; leftArm.height = 48;
        leftArm.anchor.set(1, 0);
        leftArm.position.set(16, 32);

        // 右手
        rightArm = new PIXI.Sprite(rightArmTexture);
        rightArm.width = 16; rightArm.height = 48;
        rightArm.anchor.set(0, 0);
        rightArm.position.set(48, 32);

        // 左腿
        leftLeg = new PIXI.Sprite(legTexture);
        leftLeg.width = 16; leftLeg.height = 48;
        leftLeg.anchor.set(0.5, 0);
        leftLeg.position.set(24, 80);

        // 右腿
        rightLeg = new PIXI.Sprite(legTexture);
        rightLeg.width = 16; rightLeg.height = 48;
        rightLeg.anchor.set(0.5, 0);
        rightLeg.position.set(40, 80);

        playerContainer.addChild(head, body, leftArm, rightArm, leftLeg, rightLeg);
        stage.addChild(playerContainer);

        app.stage.addChild(playerContainer);
        playerContainer.zIndex = 3;
        can_drawPlayer = true;
    });
}

class Players {
    hp: number;
    face: number; x: number; y: number;
    screen_x: number; screen_y: number;
    left: number; right: number; move_speed: number; acc: number;
    grav: number; jumpspeed: number; vsp: number; can_jump: boolean;
    width: number; height: number;
    leg_rad: number; hand_rad: number; needRotateHand: boolean; isRotateRighthand: boolean;

    constructor() {
        this.hp = 20;
        this.face = -1;
        this.x = (world[0].length/2)*64; this.y = Math.floor(world_height / 2) * 64 - 300;
        this.screen_x = room.width/2; this.screen_y = room.height/2-40;
        this.left = 0; this.right = 0; this.move_speed = 7; this.acc = 0;
        this.grav = 0.5; this.jumpspeed = -10; this.vsp = 0; this.can_jump = false;
        this.width = 64; this.height = 128;
        this.leg_rad = 0; this.hand_rad = 0; this.needRotateHand = false; this.isRotateRighthand = false;
    }

    initXY(): void { //初始化玩家坐标,在createWorld.js中调用
        this.x = chunk.num * chunk.width * 64 / 2;

        let i: number = 0;
        while(world[i][Math.floor(this.x / 64)] === -1) {i++;}
        this.y = i*64 - 256;
    }

    hurt(howmany: number): void {
        this.hp -= howmany;
        eventBus.emit('player:hurt');
    }
}
let player: Players = new Players();

enableKeyDoubleClickDetection();
apioxEvent.onKeyDoubleClick((detail) => {
    const key = detail.key;
    if (key === 'a' || key === 'd') {
        player.acc = 3;
    }
});
apioxEvent.onKeyDown((e) => {
    if (invenUI_isOpening) {return;}
    switch(e.key) {
        case 'a': player.face = -1; player.left = 1; break;
        case 'd': player.face = 1; player.right = 1; break;
        case 'w':
            if(player.can_jump && !invenUI_isOpening) {
                player.vsp = player.jumpspeed;
                player.can_jump = false;
            }
            break;
    }
});
apioxEvent.onKeyUp((e) => {
    if(e.key === 'a' || e.key === 'd') {
        player.left = 0; player.right = 0;
        player.acc = 0;
    }
});
apioxEvent.listenGlobal('mousedown', () => {
    if(!invenUI_isOpening && mouse.can_use) { //玩家手部旋转触发
        player.needRotateHand = true;
    }
});

function playerMove() { //玩家移动
    let dir = player.right - player.left;

    if (dir != 0) {
        if (!place_meeting(player.x + player.right * 64, player.y + 120)
        && !place_meeting(player.x + player.right * 64, player.y + 20)) {
            player.x += dir * (player.move_speed + player.acc);
        }
    }

    //改变玩家腿部旋转方向
    if(player.left === 1 || player.right === 1) {
        player.leg_rad += 0.3 + player.acc / 48;
        if(player.leg_rad >= 2 * Math.PI){player.leg_rad = 0;}
    } else {
        if(player.leg_rad !== 0 && player.leg_rad < 2 * Math.PI) {
            player.leg_rad += 0.3;
            if(player.leg_rad >= 2 * Math.PI) {player.leg_rad = 0;}
        }
    }

    //改变玩家手旋转方向
    if(player.needRotateHand) {
        if(mouse.x > player.screen_x + player.width / 2) {player.isRotateRighthand = true;}
        else {player.isRotateRighthand = false;}

        player.hand_rad += 0.3;
        if(player.hand_rad >= Math.PI) {
            player.needRotateHand = false;
            player.hand_rad = 0;
        }
    } else {
        player.hand_rad = 0;
    }
}

function playerJump() { //玩家跳跃
    player.vsp += player.grav;
    if(player.vsp != 0) {
        for(let i = 0; i < Math.abs(player.vsp); i++) {
            if(player.vsp > 0) {
                if (!(place_meeting(player.x+8, player.y+128) || place_meeting(player.x + 56, player.y + 128))) {
                    player.y += 1;
                } else {
                    // 落地瞬间根据当前下落速度计算摔落伤害
                    const fallSpeed = player.vsp;
                    if (fallSpeed > 16) {
                        player.hurt(Math.floor((fallSpeed - 16) / 2));
                    }

                    player.vsp = 0;
                    player.can_jump = true;
                    break;
                }
            }
            else {
                if(!place_meeting(player.x+32, player.y)) {
                    player.y -= 1;
                } else {
                    player.vsp = 0;
                    break;
                }
            }
        }
    }
    if(!(place_meeting(player.x+8, player.y+128) || place_meeting(player.x + 56, player.y + 128))){
        player.can_jump = false;
    }
}

function updatePlayerRender() {
    if (!can_drawPlayer) {return;}

    // 更新容器屏幕位置
    playerContainer.position.set(player.screen_x, player.screen_y);

    // 更新手部旋转
    if (player.needRotateHand) {
        const targetAngle = Math.sin(player.hand_rad) / 2;
        leftArm.rotation = player.isRotateRighthand ? 0 : targetAngle;
        rightArm.rotation = player.isRotateRighthand ? -targetAngle : 0;
    } else {
        leftArm.rotation = 0;
        rightArm.rotation = 0;
    }

    // 更新腿部旋转
    const legFactor = 2 - player.acc / 5;
    const legAngle = Math.sin(player.leg_rad) / legFactor;
    leftLeg.rotation = -legAngle;
    rightLeg.rotation = legAngle;
}

function playerLoop() {
    if(!invenUI_isOpening && player.hp > 0){ //打开背包无法移动
        playerMove();
    }
    if(player.hp > 0) {playerJump();}
    updatePlayerRender();
    
}

export { player, playerLoop };