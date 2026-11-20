import { player } from '../../../player.js';
import { widgets } from '../../../gui/gameGUI/inventory.js';
import { heartState } from '../../../gui/gameGUI/gameGuiState.js';
import { guiTextures, gui_isDrawing } from '../application.js';
import { heartContainer } from '../application.js';
import * as PIXI from 'pixi.js';

// 心形纹理
let heartTextures: {
    empty: PIXI.Texture;
    half: PIXI.Texture;
    full: PIXI.Texture;
    white: PIXI.Texture;
} | null = null;
// 10 个心形精灵
let heartSprites: PIXI.Sprite[] = [];
let bgSprites: PIXI.Sprite[] = [];
let heartInitialized: boolean = false;

function initHearts(): void {
    if (heartInitialized) {return;}
    heartContainer.removeChildren();

    // 在函数内创建纹理，此时 guiTextures 已可用
    const iconTex: PIXI.Texture = guiTextures.icons;
    heartTextures = {
        empty: new PIXI.Texture(iconTex.baseTexture, new PIXI.Rectangle(16, 0, 9, 9)),
        half: new PIXI.Texture(iconTex.baseTexture, new PIXI.Rectangle(61, 0, 9, 9)),
        full: new PIXI.Texture(iconTex.baseTexture, new PIXI.Rectangle(52, 0, 9, 9)),
        white: new PIXI.Texture(iconTex.baseTexture, new PIXI.Rectangle(25, 0, 9, 9)),
    };

    let draw_x: number = widgets.x;
    const draw_y: number = widgets.y - 40;
    for (let i = 0; i < 10; i++) {
        const sprite = new PIXI.Sprite(heartTextures.full);
        sprite.width = 32;
        sprite.height = 32;
        sprite.position.set(draw_x, draw_y);
        sprite.zIndex = 1;

        const bgSprite = new PIXI.Sprite(heartTextures.empty);
        bgSprite.width = 32;
        bgSprite.height = 32;
        bgSprite.position.set(draw_x, draw_y);
        bgSprite.zIndex = 0;

        heartContainer.addChild(bgSprite);
        bgSprites.push(bgSprite);

        heartContainer.addChild(sprite);
        heartSprites.push(sprite);
        draw_x += 28;
    }
    heartInitialized = true;
}

export function drawHeart(): void {
    if (!gui_isDrawing) {return;} // GUI 贴图未加载完成，跳过绘制
    initHearts();
    if (!heartTextures) {return;} // 防御
    const isWhitePhase: boolean = (heartState.drawWhite_phaser % 2 === 0);
    for (let i = 0; i < 10; i++) {
        const sprite: PIXI.Sprite = heartSprites[i];
        const bgSprite: PIXI.Sprite = bgSprites[i];
        if (isWhitePhase) {
            bgSprite.texture = heartTextures.white;
        } else {
            bgSprite.texture = heartTextures.empty;
        }
        if (player.hp >= 2 * (i + 1)) {
            sprite.texture = heartTextures.full;
            sprite.visible = true;
        } else if (player.hp === 2 * (i + 1) - 1) {
            sprite.texture = heartTextures.half;
            sprite.visible = true;
        } else {
            sprite.visible = false;
        }
    }
    //控制容器可见性
    heartContainer.visible = true;
}
