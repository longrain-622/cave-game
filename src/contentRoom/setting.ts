import { lang, setLanguage } from '../others/i18n.js';
import { apioxEvent, ApioxAnyEvent } from '../apiox/event.js';
import { apiObjects, ApioxObject } from '../apiox/dom.js';
import { detectPlatform } from '../apiox/method.js';
import { win } from '../apiox/global.js';
import { toast, toastCancel, toastSure, toastText } from './content.js';

const setting: {
    phoneButton_isOpening: boolean;
    screenRotate_isOpening: boolean;
} = {
    phoneButton_isOpening: false,
    screenRotate_isOpening: false,
}

if(detectPlatform() === 'mobile') {
    setting.phoneButton_isOpening = true;
    setting.screenRotate_isOpening = true;
}

apioxEvent.listenGlobal('DOMContentLoaded', () => {
    const touchKeysCheckbox = new ApioxObject('touchKeys');
    const rotateScreenCheckbox = new ApioxObject('rotateScreen');
    const languageSelect = new ApioxObject('languageSelect');

    const handleSettingChange = (event: ApioxAnyEvent): void => {
        const target: ApioxObject = event.target;
        if (!target) {return;}
        const isEnabled: boolean = target.domProperty('checked') as boolean;

        switch(target.id) {
            case 'touchKeys':
                setting.phoneButton_isOpening = isEnabled;
                console.log(`phone button was ${isEnabled ? 'opened' : 'closed'}`);
                break;
            case 'rotateScreen':
                setting.screenRotate_isOpening = isEnabled;
                console.log(`rotate screen is ${isEnabled ? 'opened' : 'closed'}`);
                break;
        }
    };

    touchKeysCheckbox.on('change', handleSettingChange);

    // 单独处理旋转屏幕开关
    let rotateSureHandler: ((e: any) => void) | null = null;
    let rotateCancelHandler: ((e: any) => void) | null = null;

    rotateScreenCheckbox.on('change', (event: ApioxAnyEvent) => {
        const target: ApioxObject = event.target as ApioxObject;
        if (!target) {return;}
        const isEnabled: boolean = target.domProperty('checked') as boolean;

        // 更新 setting 状态（保持与原逻辑一致）
        setting.screenRotate_isOpening = isEnabled;
        console.log(`rotate screen is ${isEnabled ? 'opened' : 'closed'}`);

        if (isEnabled) {
            toastText.domProperty('textContent', apiObjects.win.t('toast.text1')); //设置弹窗文本
            toast.domstyle('display', 'block'); //显示弹窗（假设 toast 默认隐藏）

            // 移除旧监听（避免重复绑定）
            if (rotateSureHandler) {
                toastSure.off('click', rotateSureHandler);
                toastCancel.off('click', rotateCancelHandler);
            }

            // 确定按钮
            const onSure = () => {
                // 锁定横屏
                const orientation = win.screen.orientation as any;
                if (orientation?.lock) {
                    orientation.lock('landscape').catch((err: any) => console.warn(err));
                }
                // 关闭弹窗
                toast.domstyle('display', 'none');
                // 清理监听
                toastSure.off('click', onSure);
                toastCancel.off('click', onCancel);
                rotateSureHandler = null;
                rotateCancelHandler = null;
            };

            // 取消按钮
            const onCancel = () => {
                // 关闭弹窗
                toast.domstyle('display', 'none');
                // 取消勾选，恢复状态
                target.domProperty('checked', false);
                setting.screenRotate_isOpening = false;
                // 清理监听
                toastSure.off('click', onSure);
                toastCancel.off('click', onCancel);
                rotateSureHandler = null;
                rotateCancelHandler = null;
            };

            rotateSureHandler = onSure;
            rotateCancelHandler = onCancel;

            toastSure.on('click', onSure);
            toastCancel.on('click', onCancel);
        }
    });

    languageSelect.domProperty('value', lang);

    languageSelect.on('change', async (event: ApioxAnyEvent) => {
        const target: ApioxObject = event.target;
        if (target) {
            const newLang: string = target.domProperty('value') as string;
            await setLanguage(newLang);
            target.domProperty('value', newLang);
        }
    });
});

export { setting };