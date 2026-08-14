export function disableGlobalContextMenu(): void {
    const handler = (event: MouseEvent) => {
        event.preventDefault();
    };
    document.addEventListener('contextmenu', handler);
}

export function reloadPage(): void {
    window.location.reload();
}

export function detectPlatform(): 'mobile' | 'desktop' {
    const hasTouch: boolean = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isCoarse: boolean = window.matchMedia('(pointer: coarse)').matches;
  
    //const isSmallScreen: boolean = window.innerWidth <= 768;

    const mobileRegex: RegExp = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini/i;
    const isMobileUA: boolean = mobileRegex.test(navigator.userAgent);

    if ((hasTouch && isCoarse) || isMobileUA) {
        return 'mobile';
    }
    return 'desktop';
}

export const apiMethod = {
    get viewportWidth() { return window.innerWidth; },
    get viewportHeight() { return window.innerHeight; },
    select: (selector: string) => document.querySelector(selector),
    selectAll: (selector: string) => Array.from(document.querySelectorAll(selector)),
};

export const log = {
    info(...args: unknown[]): void {
        console.log(...args);
    },
    warn(...args: unknown[]): void {
        console.warn(...args);
    },
    error(...args: unknown[]): void {
        console.error(...args);
    },
};
