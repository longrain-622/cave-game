// 语言状态(叶子模块,无副作用):供 shell 的 i18n.ts 与游戏链共享。
// 游戏链不再直接导入 i18n.ts,避免运行时二次求值其副作用。
const SUPPORTED_LANGS: string[] = [
    'zh-CN', 'zh-TW', 'en-UK', 'ja-JP', 'fr-FR',
    'de-DE', 'es-ES', 'ko-KR', 'ru-RU', 'sv-SE',
];

let lang: string = 'zh-CN';

function normalizeSavedLang(savedLang: string | null): string | null {
    if (savedLang === null || savedLang === '') {return null;}
    if (SUPPORTED_LANGS.indexOf(savedLang) !== -1) {return savedLang;}
    // 旧版本只存过 "en"；统一映射到实际存在语言包目录 en-UK。
    if (savedLang === 'en') {return 'en-UK';}
    return null;
}

function matchBrowserLang(browserLang: string): string {
    const lower: string = browserLang.toLowerCase();
    if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo')) {return 'zh-TW';}
    if (lower.startsWith('zh')) {return 'zh-CN';}
    if (lower.startsWith('ja')) {return 'ja-JP';}
    if (lower.startsWith('fr')) {return 'fr-FR';}
    if (lower.startsWith('de')) {return 'de-DE';}
    if (lower.startsWith('es')) {return 'es-ES';}
    if (lower.startsWith('ko')) {return 'ko-KR';}
    if (lower.startsWith('ru')) {return 'ru-RU';}
    if (lower.startsWith('sv')) {return 'sv-SE';}
    return 'en-UK';
}

function initLang(savedLang: string | null, browserLang: string): void {
    const saved: string | null = normalizeSavedLang(savedLang);
    lang = saved ?? matchBrowserLang(browserLang);
}

export function getLang(): string { return lang; }
export function setLang(newLang: string): void { lang = newLang; }
export { initLang };
