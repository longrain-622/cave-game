import { coverWhenSave, readingWorld } from "../gameState.js";
import { notNullUndefined } from "../../constants/utils.js";

const DAY_LENGTH: number = 1440; // 一天总秒数

const clock: {
    timer: number; // 天空计时器
    logicTimer: number;
    daylong: number;
    addTimer: () => void;
} = {
    timer: 128,
    logicTimer: 0,
    daylong: DAY_LENGTH,
    addTimer() {
        this.timer++;
        if (this.timer >= this.daylong) {this.timer = 0;}
    }
};

// 读档时恢复 clock.timer
if (coverWhenSave && notNullUndefined(readingWorld)) {
    if (
        (!Number.isNaN(readingWorld.skyTimer))
        && notNullUndefined(readingWorld.skyTimer)
    ) {
        clock.timer = readingWorld.skyTimer;
    } else {
        clock.timer = 128;
    }
}

export function skyLogicLoop(delta: number): void {
    clock.logicTimer += delta;
    if (clock.logicTimer >= 60) {
        clock.logicTimer = 0;
        clock.addTimer();
    }
}

export { clock };
