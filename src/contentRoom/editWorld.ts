import { ApioxObject, apiObjects } from '../apiox/dom.js';

// worldwindow 相关元素
const gameDifficulty_btn = new ApioxObject(null, 'gameDifficulty-btn');
let gameDifficulty: number = 0;
let gameDifficulties: string[] = [];

const worldwindow = new ApioxObject('worldwindow');
const editWorld = new ApioxObject('editWorld');
const editWorldBtnQuit = new ApioxObject('editWorldBtnQuit');
const editWorldBtnCreate = new ApioxObject('editWorldBtnCreate');
export const wolrdCreator = new ApioxObject('wolrdCreator');
const create_btn = new ApioxObject(null, 'create-btn');
const back_btn = new ApioxObject(null, 'back-btn');

worldwindow.hide();

back_btn.on('click', (): void => { wolrdCreator.hide(); editWorld.show(); });
editWorldBtnQuit.on('click', (): void => { worldwindow.hide(); });
editWorldBtnCreate.on('click', (): void => { editWorld.hide(); wolrdCreator.show(); });

function updateDifficultyTexts(): void {
    gameDifficulties = [
        (apiObjects.win as any).t('worldCreation.gameDifficulty0'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty1'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty2'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty3')
    ];
    if (gameDifficulties[gameDifficulty] !== undefined) {
        gameDifficulty_btn.domProperty('textContent', gameDifficulties[gameDifficulty]);
    }
}
apiObjects.win.addEventListener('i18nReady', () => {
    updateDifficultyTexts();
});
if ((apiObjects.win as any).t) {
    updateDifficultyTexts();
}
gameDifficulty_btn.on('click', function() {
    gameDifficulty++;
    if (gameDifficulty > 3) { gameDifficulty = 0; }
    const newText: string = gameDifficulties[gameDifficulty];
    if (newText !== undefined) {
        gameDifficulty_btn.domProperty('textContent', newText);
    }
});

export { worldwindow, create_btn };
