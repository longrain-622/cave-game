import { eventBus } from "../others/eventBus.js";
import { chunk } from "../const.js"
import { player } from "../player.js";
import { animalArray } from "../animals/animals.js";
import { dropArray } from "../dropped/droppedItem.js";
import { particleArray } from "../particle.js";

eventBus.on('chunk:create', (behind) => {
    if(!behind) {
        const offset: number = chunk.width * 64;

        player.x += offset;

        for(let i = 0; i < animalArray.length; i++) {
            animalArray[i].x += offset;
        }

        for(let i = 0; i < dropArray.length; i++) {
            dropArray[i].x += offset;
        }

        for(let C = 0; C < particleArray.length; C++) {
            particleArray[C].x += offset;
        }
    }
});
