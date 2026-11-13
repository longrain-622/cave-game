import { eventBus } from "../others/eventBus.js";
import { chunk } from "../world.js"
import { player } from "../player.js";
import { animalArray } from "../animals/animalIds.js";
import { dropArray } from "../dropped/droppedItem.js";
import { particleArray } from "../particle.js";
import { furnaceArray } from "../gui/gameGUI/blockGUI/furnace.js";
import { chests } from "../gui/gameGUI/blockGUI/chest.js";
import { entityBlock_array } from "./entityBlock.js";

eventBus.on('chunk:create', (behind) => {
    if (!behind) {
        const offset: number = chunk.width * 64;

        player.x += offset;

        for (let i = 0; i < animalArray.length; i++) {
            animalArray[i].x += offset;
        }

        for (let i = 0; i < dropArray.length; i++) {
            dropArray[i].x += offset;
        }

        for (let C = 0; C < particleArray.length; C++) {
            particleArray[C].x += offset;
        }

        for (let i = 0; i < entityBlock_array.length; i++) {
            entityBlock_array[i].world_x += chunk.width;
            entityBlock_array[i].x = entityBlock_array[i].world_x * 64;
        }

        for (let k = 0; k < furnaceArray.length; k++) {
            furnaceArray[k].world_x += chunk.width;
        }

        for (let k = 0; k < chests.length; k++) {
            chests[k].world_x += chunk.width;
        }
    }
});
