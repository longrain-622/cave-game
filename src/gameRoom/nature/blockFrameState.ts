let timer: number = 0;
let waterTimer: number = 0;

export const fireMaxTick: number = 31;
export let fireTick: number = 0; // 0 ~ 31

export const waterMaxTick: number = 31;
export let waterTick: number = 0; // 0 ~ 31
export const waterTickDelta: number = 4; // 水每个动画帧持续的 delta 数

export function blockFrameLoop(delta: number): void {
    timer += delta;
    if (timer >= 2) {
        timer = 0;
        fireTick = (fireTick + 1) % (fireMaxTick + 1);
    }

    waterTimer += delta;
    if (waterTimer >= waterTickDelta) {
        waterTimer = 0;
        waterTick = (waterTick + 1) % (waterMaxTick + 1);
    }
}
