import { detectPlatform } from '../apiox/method.js';
import { winObj } from '../apiox/global.js';

// 设置配置:挂载于 window,跨打包/运行时边界共享同一实例。
// 游戏链(如 mobileTouch)不再直接导入 contentRoom/setting.ts,避免运行时二次求值其副作用。
interface SettingConfig {
    phoneButton_isOpening: boolean;
    screenRotate_isOpening: boolean;
}

const SETTING_KEY = '__CAVEGAME_SETTING__';

function getSetting(): SettingConfig {
    const win = winObj() as any;
    if (!win[SETTING_KEY]) {
        win[SETTING_KEY] = {
            phoneButton_isOpening: detectPlatform() === 'mobile',
            screenRotate_isOpening: detectPlatform() === 'mobile',
        };
    }
    return win[SETTING_KEY];
}

export { getSetting, SettingConfig };
