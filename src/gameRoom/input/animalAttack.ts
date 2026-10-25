import { apioxEvent } from '../../apiox/event.js';
import { point_coll_rect } from '../const.js';
import { player } from '../player.js';
import { mouse } from './mouseState.js';
import { animalArray } from '../animals/animalIds.js';
import { animalInjured } from '../animals/instance/generic.js';
import { eventBus } from '../others/eventBus.js';

apioxEvent.listenGlobal('click', (): void => {
    if (mouse.can_use) { // 攻击动物
        for (let i = 0; i < animalArray.length; i++) {
            const animal = animalArray[i];
            if (animal.isDying || animal.hp <= 0) {continue;} // 已死亡不再受攻击

            const target_x = player.screen_x + animal.x - player.x;
            const target_y = player.screen_y + animal.y - player.y;

            if (point_coll_rect(mouse.x, mouse.y, target_x, target_y, animal.width, animal.height)) {
                animalInjured(animal, true, 1);
                eventBus.emit('player:attack');
            }
        }
    }
});
