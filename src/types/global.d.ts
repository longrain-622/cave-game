// global.d.ts
export {};

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
    applyI18nToElement?: (element: Element) => void;
    t?: (path: string) => string;
  }
}