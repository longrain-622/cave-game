import { saveGameToLocal } from '../../user/saveWorld.js';
import { coverWhenSave } from '../gameState.js';
import { reloadPage } from '../../apiox/method.js';
import { apioxNet } from '../../apiox/net.js';
import { isClient, isHost } from '../session.js';

export async function quitGame(): Promise<void> {
    if (isClient()) {
        try {
            await apioxNet.leave();
        } catch (error) {
            console.warn('cannot leave LAN room', error);
        }
        reloadPage();
        return;
    }

    if (isHost()) {
        try {
            const { stopHosting } = await import('../net/hostNet.js');
            stopHosting();
            await apioxNet.stopHost();
        } catch (error) {
            console.warn('cannot stop LAN hosting', error);
        }
    }

    await saveGameToLocal(coverWhenSave);
    reloadPage();
}
