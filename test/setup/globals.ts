// 测试环境的全局 DOM stub
// 游戏运行在浏览器中，而 bmFunction 的依赖链里 apiox/dom.ts 等模块在模块顶层引用了 document/window，
// 在 Node 测试环境下并不存在。这里提供最小可用 stub，仅保证模块能加载，不模拟真实行为。
function noop(): void {}

interface FakeElement {
    style: Record<string, string>;
    width: number;
    height: number;
    appendChild: () => void;
    addEventListener: () => void;
    removeEventListener: () => void;
    getContext: () => null;
}

const fakeElement: FakeElement = {
    style: {},
    width: 0,
    height: 0,
    appendChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
    getContext: () => null,
};

const fakeDocument: {
    title: string;
    querySelector: (selector: string) => null;
    querySelectorAll: (selector: string) => [];
    getElementById: (id: string) => null;
    getElementsByClassName: (className: string) => [];
    createElement: (tagName: string) => FakeElement;
    addEventListener: () => void;
    removeEventListener: () => void;
    dispatchEvent: () => boolean;
} = {
    title: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByClassName: () => [],
    createElement: () => fakeElement,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
};

class FakeImage {}

const fakeWindow: {
    addEventListener: () => void;
    removeEventListener: () => void;
    innerWidth: number;
    innerHeight: number;
    location: { reload: () => void };
    matchMedia: (query: string) => { matches: boolean };
    AudioContext: new () => { state: string; resume: () => Promise<void> };
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
    requestAnimationFrame: (callback: () => void) => number;
    cancelAnimationFrame: () => void;
    screen: { orientation: { addEventListener: () => void } };
} = {
    addEventListener: noop,
    removeEventListener: noop,
    innerWidth: 1280,
    innerHeight: 720,
    location: { reload: noop },
    matchMedia: () => ({ matches: false }),
    AudioContext: class { state: string = 'running'; resume(): Promise<void> { return Promise.resolve(); } },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (callback: () => void): number => { callback(); return 0; },
    cancelAnimationFrame: noop,
    screen: { orientation: { addEventListener: noop } },
};

(globalThis as any).document = fakeDocument;
(globalThis as any).window = fakeWindow;
(globalThis as any).Image = FakeImage;
