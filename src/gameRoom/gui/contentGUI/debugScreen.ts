import { version } from "../../../constants/generic.js";
import { BlockPos, chunk, world_height } from "../../world.js";
import { player } from "../../player.js";
import { renderFPS } from "../../rendering/rendering.js";
import { apioxEvent } from "../../../apiox/event.js";
import { textStyle1 } from "../../../constants/pixiStyles.js";
import { guiApp } from "../application.js";
import * as PIXI from 'pixi.js';

interface DebugMessage {
    title: string;
    author: string;
    fps: string;
    playerPosition: string;
}
const debugMessage: DebugMessage = {
    title: 'CaveGame ' + version,
    author: 'Made by Sinuxu.',
    fps: '0 fps VSync',
    playerPosition: 'XY: 0 / 0'
};

let debugScreen_isOpening: boolean = false;
let debugScreenPixi_inited: boolean = false;
interface DebugScreen {
    container: PIXI.Container;

    titleBg: PIXI.Graphics;
    authorBg: PIXI.Graphics;
    fpsBg: PIXI.Graphics;
    playerPositionBg: PIXI.Graphics;

    title: PIXI.Text;
    author: PIXI.Text;
    fps: PIXI.Text;
    playerPosition: PIXI.Text;

    init: () => void;
}
interface DebugScreenLine {
    bg: PIXI.Graphics;
    text: PIXI.Text;
}

const debugScreen: DebugScreen = {
    container: new PIXI.Container(),

    titleBg: new PIXI.Graphics(),
    authorBg: new PIXI.Graphics(),
    fpsBg: new PIXI.Graphics(),
    playerPositionBg: new PIXI.Graphics(),

    title: new PIXI.Text(),
    author: new PIXI.Text(),
    fps: new PIXI.Text(),
    playerPosition: new PIXI.Text(),

    init(): void {
        debugScreenPixi_inited = true;

        if (!this.container.parent) {
            guiApp.stage.addChild(this.container);
        }
        this.container.removeChildren();
        this.container.visible = debugScreen_isOpening;

        const fontSize: number = 24;
        this.title = new PIXI.Text(debugMessage.title, textStyle1(fontSize));
        this.author = new PIXI.Text(debugMessage.author, textStyle1(fontSize));
        this.fps = new PIXI.Text(debugMessage.fps, textStyle1(fontSize));
        this.playerPosition = new PIXI.Text(debugMessage.playerPosition, textStyle1(fontSize));

        this.titleBg = new PIXI.Graphics();
        this.authorBg = new PIXI.Graphics();
        this.fpsBg = new PIXI.Graphics();
        this.playerPositionBg = new PIXI.Graphics();

        const lines: DebugScreenLine[] = debugScreenLines();
        layoutDebugLines();

        for (const line of lines) {
            this.container.addChild(line.bg);
        }
        for (const line of lines) {
            this.container.addChild(line.text);
        }
    },
};

function debugScreenLines(): DebugScreenLine[] {
    return [
        { bg: debugScreen.titleBg, text: debugScreen.title },
        { bg: debugScreen.authorBg, text: debugScreen.author },
        { bg: debugScreen.fpsBg, text: debugScreen.fps },
        { bg: debugScreen.playerPositionBg, text: debugScreen.playerPosition },
    ];
}

function layoutDebugLines(): void {
    const extraSize: number = 4;
    const half: number = extraSize / 2;
    let lineY: number = 0;
    for (const line of debugScreenLines()) {
        const bgWidth: number = line.text.width + extraSize;
        const bgHeight: number = line.text.height + extraSize;

        line.text.position.set(half, lineY + half);
        line.bg.clear();
        line.bg.beginFill(0x000000, 0.3);
        line.bg.drawRect(0, lineY, bgWidth, bgHeight);
        line.bg.endFill();

        lineY += bgHeight;
    }
}

apioxEvent.onKeyDown((ev): void => {
    if (ev.key !== 'F3') {return;}
    if (ev.repeat) {return;}
    ev.preventDefault();
    debugScreen_isOpening = !debugScreen_isOpening;
    debugScreen.container.visible = debugScreen_isOpening;
});

function playerPosition(player_x: number, player_y: number): BlockPos {
    return {
        x: Math.floor((player_x / 64 - chunk.left_number * 16) * 10) / 10,
        y: world_height - Math.floor((player_y / 64) * 10) / 10,
    };
}

function updateDebugMessage(): void {
    debugMessage.fps = String(renderFPS) + ' fps VSync';
    const pos: BlockPos = playerPosition(player.x, player.y);
    debugMessage.playerPosition = 'XY: ' + String(pos.x) + ' / ' + String(pos.y);
}

export function updateDebugScreen(): void {
    if (!debugScreen_isOpening) {return;}

    if (!debugScreenPixi_inited) {
        debugScreen.init();
    }

    updateDebugMessage();

    debugScreen.title.text = debugMessage.title;
    debugScreen.author.text = debugMessage.author;
    debugScreen.fps.text = debugMessage.fps;
    debugScreen.playerPosition.text = debugMessage.playerPosition;

    layoutDebugLines();
}