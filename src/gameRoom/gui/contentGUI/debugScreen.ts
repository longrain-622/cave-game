// debugScreen.ts
// F3 调试屏的开关状态
export let debugScreen_isOpening: boolean = false;

export function toggleDebugScreen(): void {
    debugScreen_isOpening = !debugScreen_isOpening;
}
