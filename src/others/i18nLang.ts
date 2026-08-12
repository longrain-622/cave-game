// 语言状态(叶子模块,无副作用):供 shell 的 i18n.ts 与游戏链共享。
// 游戏链不再直接导入 i18n.ts,避免运行时二次求值其副作用。
let lang: string = 'zh-CN';

function initLang(savedLang: string | null, browserLang: string): void {
    if (savedLang && (savedLang === 'zh-CN' || savedLang === 'en')) {
        lang = savedLang;
    } else {
        lang = browserLang.startsWith('zh') ? 'zh-CN' : 'en';
    }
}

export function getLang(): string { return lang; }
export function setLang(newLang: string): void { lang = newLang; }
export { initLang };
