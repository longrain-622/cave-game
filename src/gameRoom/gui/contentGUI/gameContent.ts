import { saveGameToLocal } from '../../../user/saveWorld.js';
import { coverWhenSave } from '../../gameState.js';
import { reloadPage } from '../../../apiox/method.js';

export async function quitGame(): Promise<void> {
    await saveGameToLocal(coverWhenSave);
    reloadPage();
}
