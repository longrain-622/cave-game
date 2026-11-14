import { eventBus } from "../gameRoom/others/eventBus.js";
import { playerFallinWater } from "../gameRoom/particle.js";
import { eventBusSwitch } from "../gameRoom/gameState.js";
import "../gameRoom/others/audioManager.js";

export function checkEventBus(): void {
    if (eventBusSwitch.itemPickup > 0) {
        eventBusSwitch.itemPickup--;
        eventBus.emit('item:pickup');
    }
    if (eventBusSwitch.playerHurt > 0) {
        eventBusSwitch.playerHurt--;
        eventBus.emit('player:hurt');
    }
    if (eventBusSwitch.playerFallinWater > 0) {
        eventBusSwitch.playerFallinWater--;
        eventBus.emit('player:fallInWater');
    }
}

function main(): void {
    eventBus.on('player:fallInWater', (): void => {
        playerFallinWater();
    });
}
main();