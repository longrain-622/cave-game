import * as PIXI from 'pixi.js';

import { player, remotePlayers } from '../../player.js';
import type { Players } from '../../player.js';
import { app, blockTextures } from '../rendering.js';
import { applyLightTint } from '../light.js';
import { inventory, widgets } from '../../gui/gameGUI/inventory.js';
import { uistate } from '../../gui/uiState.js';
import { idOfBlock } from '../../nature/blockMecha/blocks.js';
import { isTool } from '../../dropped/itemIds.js';
import { itemTextures } from '../items/itemTextures.js';
import { flipDraw } from '../../dropped/items.js';
import { isOnScreen } from '../../others/const.js';

export let can_drawPlayer: boolean = false;

interface PlayerParts {
    container: PIXI.Container;
    head: PIXI.Sprite;
    body: PIXI.Sprite;
    leftArm: PIXI.Sprite;
    rightArm: PIXI.Sprite;
    leftLeg: PIXI.Sprite;
    rightLeg: PIXI.Sprite;
    taking: PIXI.Sprite;
}

interface PlayerTextures {
    head: PIXI.Texture;
    body: PIXI.Texture;
    leftArm: PIXI.Texture;
    rightArm: PIXI.Texture;
    leg: PIXI.Texture;
}

let playerTextures: PlayerTextures | null = null;
let localParts: PlayerParts | null = null;
const remoteParts: Map<string, PlayerParts> = new Map();
const playerTextureUrl: string = 'assets/images/games/player/players.png';

function createPlayerParts(): PlayerParts {
    const textures: PlayerTextures = playerTextures as PlayerTextures;

    const head = new PIXI.Sprite(textures.head);
    head.width = 32; head.height = 32;
    head.position.set(16, 0);

    const body = new PIXI.Sprite(textures.body);
    body.width = 32; body.height = 48;
    body.position.set(16, 32);

    const leftArm = new PIXI.Sprite(textures.leftArm);
    leftArm.width = 16; leftArm.height = 48;
    leftArm.anchor.set(1, 0);
    leftArm.position.set(16, 32);

    const rightArm = new PIXI.Sprite(textures.rightArm);
    rightArm.width = 16; rightArm.height = 48;
    rightArm.anchor.set(0, 0);
    rightArm.position.set(48, 32);

    const leftLeg = new PIXI.Sprite(textures.leg);
    leftLeg.width = 16; leftLeg.height = 48;
    leftLeg.anchor.set(0.5, 0);
    leftLeg.position.set(24, 80);

    const rightLeg = new PIXI.Sprite(textures.leg);
    rightLeg.width = 16; rightLeg.height = 48;
    rightLeg.anchor.set(0.5, 0);
    rightLeg.position.set(40, 80);

    const taking = new PIXI.Sprite(PIXI.Texture.EMPTY);
    taking.anchor.set(0.5);
    taking.position.set(0, 60);

    const container = new PIXI.Container();

    container.addChild(head, body, leftArm, rightArm, leftLeg, rightLeg, taking);
    app.stage.addChild(container);
    container.zIndex = 3;

    return { container, head, body, leftArm, rightArm, leftLeg, rightLeg, taking };
}

// 贴图加载完成后构建玩家各部位纹理和本地玩家容器
function initPlayerParts(baseTexture: PIXI.BaseTexture): void {
    if (playerTextures !== null) {return;}

    baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

    playerTextures = {
        head: new PIXI.Texture(baseTexture, new PIXI.Rectangle(8, 8, 8, 8)),
        body: new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 20, 8, 12)),
        leftArm: new PIXI.Texture(baseTexture, new PIXI.Rectangle(44, 20, 4, 12)),
        rightArm: new PIXI.Texture(baseTexture, new PIXI.Rectangle(36, 52, 4, 12)),
        leg: new PIXI.Texture(baseTexture, new PIXI.Rectangle(20, 52, 4, 12)),
    };

    localParts = createPlayerParts();
    can_drawPlayer = true;
}

// 加载玩家贴图：BaseTexture.from 命中缓存时实例已加载完毕（valid=true），
// 'loaded' 事件不会再触发，此时必须直接构建，否则玩家会一直不显示
function loadPlayerTexture(): void {
    const baseTexture: PIXI.BaseTexture = PIXI.BaseTexture.from(playerTextureUrl);
    if (baseTexture.valid) {
        initPlayerParts(baseTexture);
    } else {
        baseTexture.once('loaded', (): void => {
            initPlayerParts(baseTexture);
        });
        baseTexture.once('error', (_baseTexture: PIXI.BaseTexture, event: ErrorEvent): void => {
            console.error('load player texture error', event);
        });
    }
}

// 手末端偏移向量 (8, 48) 的长度 旋转不改变长度，外推用常量避免每帧开方
const tipLen: number = Math.hypot(8, 48);

// 更新本地玩家手持物品显示
function updateTakingItem(parts: PlayerParts): void {
    if (!can_drawPlayer) {return;}
    if (inventory.items[widgets.select].item === idOfBlock.air) {
        parts.taking.visible = false;
        return;
    }

    const slot = inventory.items[widgets.select];
    const isToolItem: boolean = isTool(slot.item);
    const flipDiag: boolean = flipDraw(slot.item); // 需要沿左下-右上对角线翻转的物品
    let tex: PIXI.Texture | null = null;
    if (slot.item < 512) {tex = blockTextures[slot.item] || null;}
    else {tex = itemTextures[slot.item] || null;}

    if (uistate.invenUI_isOpening() || slot.item === -1 || tex === null) {
        parts.taking.visible = false;
        return;
    }
    parts.taking.visible = true;
    parts.taking.texture = tex;

    if (isToolItem) { // 先赋值纹理再按纹理尺寸算 scale，避免 width/height setter 残留 _width 导致拉伸
        parts.taking.anchor.set(0, 1); // 工具（flipDraw 物品的 scale.x 再取反：对角镜像 = 轴翻转 + 旋转 90°，旋转见下方）
        parts.taking.scale.set(
            (player.rightOnMouse ? 1 : -1) * (flipDiag ? -1 : 1) * 48 / tex.orig.width,
            48 / tex.orig.height
        );
    } else { // 普通物品
        parts.taking.anchor.set(0.5);
        parts.taking.scale.set(24 / tex.orig.width, 24 / tex.orig.height);
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
        parts.taking.position.set(handX, handY);
    } else {
        // 普通物品中心沿手臂方向外推
        const push: number = 4; // 物品中心到手的额外距离
        parts.taking.position.set(
            handX + dx / tipLen * push,
            handY + dy / tipLen * push
        );
    }

    // 物品随所在的手一起旋转；flipDraw 物品再沿左下-右上对角线镜像
    // （右手 +90°、左手 -90°，与 scale.x 的所在手翻转组合后左右对称）
    parts.taking.rotation = armAngle + (flipDiag ? (player.rightOnMouse ? Math.PI / 2 : -Math.PI / 2) : 0);
}

function updateLimbs(parts: PlayerParts, target: Players): void {
    if (target.needRotateHand) {
        const targetAngle = Math.sin(target.hand_rad) / 2;
        parts.leftArm.rotation = target.isRotateRighthand ? 0 : targetAngle;
        parts.rightArm.rotation = target.isRotateRighthand ? -targetAngle : 0;
    } else {
        parts.leftArm.rotation = 0;
        parts.rightArm.rotation = 0;
    }

    const legFactor = 2 - target.acc / 5;
    const legAngle = Math.sin(target.leg_rad) / legFactor;
    parts.leftLeg.rotation = -legAngle;
    parts.rightLeg.rotation = legAngle;
}

function updateRemotePlayerRender(target: Players): void {
    const drawX: number = player.screen_x + target.x - player.x;
    const drawY: number = player.screen_y + target.y - player.y;

    if (!isOnScreen(drawX, drawY, target.width, target.height)) {
        const offscreenParts: PlayerParts | undefined = remoteParts.get(target.id);
        if (offscreenParts !== undefined) {offscreenParts.container.visible = false;}
        return;
    }

    let parts: PlayerParts | undefined = remoteParts.get(target.id);
    if (parts === undefined) {
        parts = createPlayerParts();
        remoteParts.set(target.id, parts);
    }

    parts.taking.visible = false;
    parts.container.position.set(drawX, drawY);
    parts.container.visible = true;
    applyLightTint(parts.container, target.x + 32, target.y + 64);
    updateLimbs(parts, target);
}

export function updatePlayerRender(): void {
    if (!can_drawPlayer || localParts === null) {return;}

    updateTakingItem(localParts);

    localParts.container.position.set(player.screen_x, player.screen_y);
    applyLightTint(localParts.container, player.x + 32, player.y + 64);
    updateLimbs(localParts, player);

    for (const target of remotePlayers.values()) {
        updateRemotePlayerRender(target);
    }

    for (const [playerId, parts] of remoteParts) {
        if (remotePlayers.has(playerId)) {continue;}
        app.stage.removeChild(parts.container);
        parts.container.destroy({ children: true });
        remoteParts.delete(playerId);
    }
}

function main(): void {
    loadPlayerTexture();
}
main();
