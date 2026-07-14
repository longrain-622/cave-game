export const win = {
    // 视口尺寸
    get inWidth(): number { return window.innerWidth; },
    get inHeight(): number { return window.innerHeight; },

    // 滚动位置
    get scrollX(): number { return window.scrollX; },
    get scrollY(): number { return window.scrollY; },

    // 滚动方法
    scrollTo(x: number, y: number): void { window.scrollTo(x, y); },
    scrollBy(x: number, y: number): void { window.scrollBy(x, y); },

    // 页面跳转
    get href(): string { return window.location.href; },
    set href(url: string) { window.location.href = url; },
    reload(): void { window.location.reload(); },

    // localStorage 快捷操作
    storage: {
        set(key: string, value: string): void { localStorage.setItem(key, value); },
        get(key: string): string | null { return localStorage.getItem(key); },
        remove(key: string): void { localStorage.removeItem(key); },
        clear(): void { localStorage.clear(); }
    },

    // sessionStorage
    session: {
        set(key: string, value: string): void { sessionStorage.setItem(key, value); },
        get(key: string): string | null { return sessionStorage.getItem(key); },
        remove(key: string): void { sessionStorage.removeItem(key); },
        clear(): void { sessionStorage.clear(); }
    },

    screen: {
        get orientation(): { type: string; angle: number } {
            const screen = window.screen;
            if (screen && 'orientation' in screen && screen.orientation) {
                return {
                    type: screen.orientation.type,
                    angle: screen.orientation.angle,
                };
            }
            const isLandscape = window.innerWidth > window.innerHeight;
            return {
                type: isLandscape ? 'landscape-primary' : 'portrait-primary',
                angle: isLandscape ? 90 : 0,
            };
        },

        lock(lockType: string): Promise<void> {
            const screen = window.screen;
            if (screen && 'orientation' in screen && screen.orientation && 'lock' in screen.orientation) {
                return (screen.orientation.lock as (type: string) => Promise<void>)(lockType);
            }
            return Promise.resolve();
        },

        unlock(): Promise<void> {
            const screen = window.screen;
            if (screen && 'orientation' in screen && screen.orientation && 'unlock' in screen.orientation) {
                (screen.orientation.unlock as () => void)();
            }
            return Promise.resolve();
        },

        onOrientationChange(listener: (info: { type: string; angle: number }) => void): () => void {
            const screen = window.screen;
            if (!(screen && 'orientation' in screen && screen.orientation)) {
                return () => {};
            }
            const handler = () => {
                listener(this.orientation);
            };
            screen.orientation.addEventListener('change', handler);
            return () => {
                screen.orientation.removeEventListener('change', handler);
            };
        },
    },
};

export const doc = {
    getTitle(): string {
        return document.title;
    },

    setTitle(title: string): void {
        document.title = title;
    },
};