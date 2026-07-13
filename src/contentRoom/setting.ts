import { setMyVariable } from '../gameRoom/const.js';
import { lang, setLanguage } from '../others/i18n.js';
import { apioxEvent, ApioxAnyEvent } from '../apiox/event.js';
import { ApioxObject } from '../apiox/dom.js';

apioxEvent.listenGlobal('DOMContentLoaded', () => {
    const touchKeysCheckbox = new ApioxObject('touchKeys');
    const rotateScreenCheckbox = new ApioxObject('rotateScreen');
    const languageSelect = new ApioxObject('languageSelect');

    const handleSettingChange = (event: ApioxAnyEvent): void => {
        const target = event.target;
        if (!target) {return;}

        const isEnabled: boolean = target.domProperty('checked') as boolean;

        if (target.id === 'touchKeys') {
            setMyVariable(2, isEnabled);
            console.log(`phone button was ${isEnabled ? 'opened' : 'closed'}`);
        } else if (target.id === 'rotateScreen') {
            setMyVariable(3, isEnabled);
            console.log(`rotate screen is ${isEnabled ? 'opened' : 'closed'}`);
        }
    };

    touchKeysCheckbox.on('change', handleSettingChange);
    rotateScreenCheckbox.on('change', handleSettingChange);

    languageSelect.domProperty('value', lang);

    languageSelect.on('change', async (event: ApioxAnyEvent) => {
        const target = event.target;
        if (target) {
            const newLang = target.domProperty('value') as string;
            await setLanguage(newLang);
            target.domProperty('value', newLang);
        }
    });
});