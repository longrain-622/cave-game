export function disableGlobalContextMenu(): void {
    const handler = (event: MouseEvent) => {
        event.preventDefault();
    };
    document.addEventListener('contextmenu', handler);
}

export function reloadPage(): void {
    window.location.reload();
}

export const apiMethod = {
    get viewportWidth() { return window.innerWidth; },
    get viewportHeight() { return window.innerHeight; },
    select: (selector: string) => document.querySelector(selector),
    selectAll: (selector: string) => Array.from(document.querySelectorAll(selector)),
};
