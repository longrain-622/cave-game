import { getRandomInt, room } from '../gameRoom/const.js';
import { ApioxObject, apiObjects } from '../apiox/dom.js';
import { disableGlobalContextMenu } from '../apiox/method.js';
import { apioxEvent } from '../apiox/event.js';

export let _room_: number = 0; //当前房间

let start: number = 0;
let choose: number = 0; //左边菜单所选的选项
let last_choose: number = choose - 1;
let face: number = 0; //背景图片移动状态，0左1右-1静止
let timer: number = 0;
let gameDifficulty: number = 0; //世界大小 0小1中2大3超大
let gameDifficulties: string[] = []; //存储i18n的数组

//获取元素
export const gameRoom = new ApioxObject(null, 'GameRoom');
export const content = new ApioxObject(null, 'content');
const gameDifficulty_btn = new ApioxObject(null, 'gameDifficulty-btn');
const starting = new ApioxObject('starting');
const none = new ApioxObject('none');
const setting = new ApioxObject('setting');
const worldwindow = new ApioxObject('worldwindow');
const lookTitle = new ApioxObject('lookTitle');
const text1 = new ApioxObject('text1');
const text2 = new ApioxObject('text2');
const startText = new ApioxObject('startText');
const downloadText = new ApioxObject('downloadText');
const setText = new ApioxObject('setText');
const viewText = new ApioxObject('viewText');
//const whiteBlock1 = new ApioxObject('whiteBlock1');
const whiteBlock2 = new ApioxObject('whiteBlock2');
const starting_steve = new ApioxObject('starting_steve');
const create_btn = new ApioxObject(null, 'create-btn');
const back_btn = new ApioxObject(null, 'back-btn');
export const toast = new ApioxObject('toast');
export const toastText = new ApioxObject('toast_text');
export const toastCancel = new ApioxObject('toast_cancel');
export const toastSure = new ApioxObject('toast_sure');

// editWorld 界面元素
const editWorld = new ApioxObject('editWorld');
const editWorldBtnQuit = new ApioxObject('editWorldBtnQuit');
const editWorldBtnCreate = new ApioxObject('editWorldBtnCreate');
export const wolrdCreator = new ApioxObject('wolrdCreator');

//初始化游戏窗口 大小和显示
content.domstyle('width', String(room.width) + 'px'); content.domstyle('height', String(room.height) + 'px');
gameRoom.domstyle('width', String(room.width) + 'px'); gameRoom.domstyle('height', String(room.height) + 'px');
gameRoom.hide();
content.domstyle('display', 'grid');
disableGlobalContextMenu();

//控制背景图片的位置
const bgimg = new ApioxObject('bgimage');
bgimg.domstyle('position', 'absolute');
bgimg.domstyle('left', '-10px');
bgimg.domstyle('top', '0');

starting.hide();
none.hide();
setting.hide();
worldwindow.hide();

//点击任意空白处开始
apioxEvent.listenGlobalOnce('click', (): void => {
    start = 1;
    lookTitle.hide();
    text1.hide();
    text2.hide();
});

//创建世界选单
apioxEvent.onKeyDown((e) => {
    if(e.key !== 'Enter') {return;}
    if(start === 1 && choose === 0) {worldwindow.show();}
});
starting_steve.on('click', (): void => {
    if(start === 1 && choose === 0) {worldwindow.show();}
});
back_btn.on('click', (): void => { wolrdCreator.hide(); editWorld.show(); }); //返回 editWorld
create_btn.on('click', (): void => { _room_ = 1; gameRoom.show(); content.hide(); }); //进入游戏

// editWorld 按钮事件
editWorldBtnQuit.on('click', (): void => { worldwindow.hide(); }); //关闭世界窗口
editWorldBtnCreate.on('click', (): void => { editWorld.hide(); wolrdCreator.show(); }); //进入创建世界界面

function updateDifficultyTexts(): void {
    gameDifficulties = [
        (apiObjects.win as any).t('worldCreation.gameDifficulty0'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty1'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty2'),
        (apiObjects.win as any).t('worldCreation.gameDifficulty3')
    ];
    // 刷新按钮上显示的文本 保持当前难度索引
    if (gameDifficulties[gameDifficulty] !== undefined) {
        gameDifficulty_btn.domProperty('textContent', gameDifficulties[gameDifficulty]);
    }
}
apiObjects.win.addEventListener('i18nReady', () => { //监听国际化数据加载完成事件（由 i18n.ts 派发）
    updateDifficultyTexts();
});
if ((apiObjects.win as any).t) { //如果 i18n 在 content.ts 执行前已经加载完成，则立即更新
    updateDifficultyTexts();
}
gameDifficulty_btn.on('click', function() {
    //难度按钮点击
    gameDifficulty++;
    if (gameDifficulty > 3) { gameDifficulty = 0; }
    const newText: string = gameDifficulties[gameDifficulty];
    if (newText !== undefined) {
        gameDifficulty_btn.domProperty('textContent', newText);
    }
});

//左边主菜单内容的选择
startText.on('click', (): void => { if(start === 1){choose = 0;} });
downloadText.on('click', (): void => { if(start === 1){choose = 1;} });
setText.on('click', (): void => { if(start === 1){choose = 2;} });
viewText.on('click', (): void => { if(start === 1){choose = 3;} });

function bgimageAnimation(): void { //背景图片的左右移动
    //解析当前 left 值，若无效则默认为 0
    let currentLeft: number = parseFloat(bgimg.domstyle('left'));
    if (isNaN(currentLeft)) {currentLeft = 0;}

    //边界常量（可根据需要调整）
    const LEFT_BOUNDARY: number = -(Number(bgimg.domProperty('clientWidth')) - room.width) / room.width * 100 + 4;
    const RIGHT_BOUNDARY: number = -4;
    const PAUSE_FRAMES: number = 300; //停留帧数
    const SPEED: number = 0.0125;

    if (face === 0) { //向左移动
        currentLeft -= SPEED;
        if (currentLeft <= LEFT_BOUNDARY) {
            face = -1; //切换为等待状态
        }
    } else if (face === 1) { //向右移动
        currentLeft += SPEED;
        if (currentLeft >= RIGHT_BOUNDARY) {
            face = -1; //切换为等待状态
        }
    } else if (face === -1) { //等待状态
        timer += 1;
        if (timer >= PAUSE_FRAMES) {
            timer = 0;
            //根据当前 left 值决定下一步方向
            if (currentLeft <= LEFT_BOUNDARY) {
                face = 1; //改为向右
            } else if (currentLeft >= RIGHT_BOUNDARY) {
                face = 0; //改为向左
            }
        }
    }

    // 更新图片位置
    bgimg.domstyle('left', String(currentLeft) + '%');
}

function ctrlShow(): void { //控制各种功能的显示和隐藏
    if(start === 1) {
        if(last_choose === choose) {return;}

        if(choose !== 3) {bgimg.domstyle('filter', 'blur(5px)');}
        switch(choose) {
            case 0:
                whiteBlock2.show('flex');
                starting.show('flex');
                none.hide();
                setting.hide();
                break;
            case 2:
                whiteBlock2.show('flex');
                starting.hide(); none.hide();
                setting.show('flex');
                break;
            case 3:
                whiteBlock2.hide();
                starting.hide();
                none.hide();
                setting.hide();
                bgimg.domstyle('filter', 'blur(0px)');
                break;
            default:
                whiteBlock2.show('flex');
                starting.hide();
                none.show();
                setting.hide();
                break;
        }

        last_choose = choose;
    }
}

//页面主循环
export function contentLoop(): void {
    bgimageAnimation();
    ctrlShow();
}

//彩蛋
if(getRandomInt(0, 31) === 1) {
    const contentIcon = new ApioxObject('contentIcon');
    contentIcon.domProperty('src', 'assets/images/others/AllayPixel.png');
}
