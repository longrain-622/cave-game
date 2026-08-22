import * as PIXI from "pixi.js";

export let blockFrameLoaded: boolean = false;
const blockFrameUrl: {
    fire: string; waterStill: string;
} = {
    fire: '/assets/images/games/others/fire_0.png',
    waterStill: '/assets/images/games/blocks/water_still.png',
};
export function initBlockFrames(): void {
    PIXI.Assets.load(Object.values(blockFrameUrl)).then(() => {
        blockFrameLoaded = true;
    }).catch((error: unknown) => {
        console.error('load block frames error', error);
    });
}

let fireTick: number = 31; // 0 ~ 31
let fireFrames: PIXI.Texture[] = [];

// 火焰动画帧
function initFireTexture(): void {
    if (!blockFrameLoaded) {return;}
    PIXI.Assets.load<PIXI.Texture>(blockFrameUrl.fire).then((fireTexture: PIXI.Texture) => {
        fireFrames = [];
        for (let i: number = 0; i <= fireTick; i++) {
            const frame: PIXI.Rectangle = new PIXI.Rectangle(0, i * 16, 16, 16);
            fireFrames.push(new PIXI.Texture(fireTexture.baseTexture, frame));
        }
    });
}

function main() {
    initBlockFrames();
    initFireTexture();
}
main();