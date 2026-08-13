import { apiObjects } from "../apiox/dom.js";
import { apiMethod } from "../apiox/method.js";
import { apioxEvent } from "../apiox/event.js";
import { apioxHttp } from "../apiox/http.js";
import { getLang, setLang, initLang } from "./i18nLang.js";

let i18nData: Record<string, any> | null = null;

// 加载 JSON 文件
async function loadI18n() {
    try {
        // 页面相对路径:dev(根路径)与部署(dist 根目录)下均指向 assets/locales,打包后不随模块位置漂移
        const uiData = await apioxHttp.get<Record<string, any>>(`assets/locales/${getLang()}/ui.json`);
        const gameData = await apioxHttp.get<Record<string, any>>(`assets/locales/${getLang()}/game.json`);

        // 合并数据，gameData 中的键会覆盖 uiData（如有冲突，但通常没有）
        i18nData = { ...uiData, ...gameData };

        applyI18n();
        apiObjects.win.dispatchEvent(new CustomEvent('i18nReady', { detail: i18nData }));
        console.log('i18n was loaded');
    } catch (error) {
        console.error('ui.json error:', error);
    }
}

// 根据点路径获取嵌套值
function getByPath(obj: Record<string, any> | null | undefined, path: string | Record<string, any>) {
    if (!obj || !path) {return null;}
    return path.split('.').reduce((cur: any, key: string) => cur?.[key], obj);
}

// 应用国际化：遍历所有带 data-i18n 和 data-i18n-placeholder 的元素
function applyI18n() {
    if (!i18nData) {return;}

    // 处理 data-i18n（文本内容）
    apiMethod.selectAll('[data-i18n]').forEach(el => {
        const path: string = el.getAttribute('data-i18n');
        const value = getByPath(i18nData, path);
        if (value !== undefined && value !== null) {
            el.textContent = value;
        }
    });

    // 处理 data-i18n-placeholder（占位符）
    apiMethod.selectAll('[data-i18n-placeholder]').forEach(el => {
        const path: string = el.getAttribute('data-i18n-placeholder');
        const value = getByPath(i18nData, path);
        if (value !== undefined && value !== null) {
            (el as HTMLInputElement | HTMLTextAreaElement).placeholder = value;
        }
    });
}

// 对外暴露：动态切换语言
export async function setLanguage(newLang: string) {
    if (newLang === getLang()) {return;}
    setLang(newLang);
    // 可存储用户偏好
    localStorage.setItem('cavegame_lang', newLang);
    await loadI18n();
}

// 应用语言到单个元素（供动态添加元素使用）
apiObjects.win.applyI18nToElement = (element: Element) => {
    if (!i18nData) {return;}
    if (element.hasAttribute('data-i18n')) {
        const path: string = element.getAttribute('data-i18n');
        const value = getByPath(i18nData, path);
        if (value !== undefined) {element.textContent = value;}
    }
    if (element.hasAttribute('data-i18n-placeholder')) {
        const path = element.getAttribute('data-i18n-placeholder');
        const value = getByPath(i18nData, path);
        if (value !== undefined) {(element as HTMLInputElement).placeholder = value;}
    }
};

// 全局获取文字方法
apiObjects.win.t = (path) => {
    return getByPath(i18nData, path) || path;
};

// 读取存储的语言偏好并启动
function initLanguage() {
    initLang(localStorage.getItem('cavegame_lang'), navigator.language);
    loadI18n();
}

if (apiObjects.docum.readyState === 'loading') {
    apioxEvent.listenGlobal('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}
