import { getLang } from '../others/i18nLang.js';
import { setLanguage } from '../others/i18n.js';
import { apioxEvent, ApioxAnyEvent } from '../apiox/event.js';
import { apiObjects, ApioxObject } from '../apiox/dom.js';
import { win } from '../apiox/global.js';
import { log } from '../apiox/method.js';
import { apioxTime } from '../apiox/time.js';
import { toast, toastCancel, toastSure, toastText } from './content.js';
import { getSetting, SettingConfig } from '../constants/settingConfig.js';

const setting: SettingConfig = getSetting();

apioxEvent.listenGlobal('DOMContentLoaded', () => {
    const touchKeysCheckbox = new ApioxObject('touchKeys');
    const rotateScreenCheckbox = new ApioxObject('rotateScreen');
    const languageSelect = new ApioxObject('languageSelect');

    // 弹窗隐藏定时器（出场动画播完后再真正隐藏）
    let toastHideTimer: number | null = null;
    // 隐藏弹窗：先播放出场动画，结束后再设置 display:none
    const hideToast = (): void => {
        toast.addClass('toast-exit');
        if (toastHideTimer !== null) {
            apioxTime.clearOut(toastHideTimer);
        }
        toastHideTimer = apioxTime.setOut(() => {
            toast.domstyle('display', 'none');
            toast.removeClass('toast-exit');
            toastHideTimer = null;
        }, 220);
    };
    // 显示弹窗：清除残留的出场状态后展示（入场动画随之播放）
    const showToast = (): void => {
        if (toastHideTimer !== null) {
            apioxTime.clearOut(toastHideTimer);
            toastHideTimer = null;
        }
        toast.removeClass('toast-exit');
        toast.domstyle('display', 'block');
    };

    const handleSettingChange = (event: ApioxAnyEvent): void => {
        const target: ApioxObject = event.target;
        if (!target) {return;}
        const isEnabled: boolean = target.domProperty('checked') as boolean;

        switch (target.id) {
            case 'touchKeys':
                setting.phoneButton_isOpening = isEnabled;
                log.info(`phone button was ${isEnabled ? 'opened' : 'closed'}`);
                break;
            case 'rotateScreen':
                setting.screenRotate_isOpening = isEnabled;
                log.info(`rotate screen is ${isEnabled ? 'opened' : 'closed'}`);
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
        log.info(`rotate screen is ${isEnabled ? 'opened' : 'closed'}`);

        if (isEnabled) {
            toastText.domProperty('textContent', apiObjects.win.t('toast.text1')); //设置弹窗文本
            showToast(); //显示弹窗（入场动画）

            // 移除旧监听（避免重复绑定）
            if (rotateSureHandler) {
                toastSure.off('click', rotateSureHandler);
                toastCancel.off('click', rotateCancelHandler);
            }

            // 确定按钮
            const onSure = (): void => {
                // 锁定横屏
                win.screen.lock('landscape').catch((err: any) => log.warn(err));
                // 关闭弹窗（出场动画）
                hideToast();
                // 清理监听
                toastSure.off('click', onSure);
                toastCancel.off('click', onCancel);
                rotateSureHandler = null;
                rotateCancelHandler = null;
            };

            // 取消按钮
            const onCancel = () => {
                // 关闭弹窗（出场动画）
                hideToast();
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
        } else {
            // 关闭旋转开关时解锁横屏（若之前确认锁定过）
            win.screen.unlock();
        }
    });

    languageSelect.domProperty('value', getLang());

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