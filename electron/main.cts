import { app, BrowserWindow, Menu, net, protocol, shell, type Rectangle } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_ID: string = 'com.sinuxu.cavegame';
const APP_SCHEME: string = 'app';
const APP_HOST: string = 'cavegame';
const DEV_SERVER_URL: string = process.env.VITE_DEV_SERVER_URL || '';
const INDEX_FILE: string = 'index.html';
const CONTENT_ASPECT_WIDTH: number = 16;
const CONTENT_ASPECT_HEIGHT: number = 9;

let mainWindow: BrowserWindow | null = null;

function getDistDir(): string {
    return path.join(app.getAppPath(), 'dist');
}

function isPathInside(root: string, target: string): boolean {
    const relative: string = path.relative(root, target);
    return relative !== ''
        && relative !== '..'
        && !relative.startsWith('..' + path.sep)
        && !path.isAbsolute(relative);
}

function textResponse(status: number, message: string): Response {
    return new Response(message, {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
}

function registerAppScheme(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: APP_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                corsEnabled: true,
                stream: true,
            },
        },
    ]);
}

function handleAppRequest(request: Request): Response | Promise<Response> {
    let url: URL;
    try {
        url = new URL(request.url);
    } catch {
        return textResponse(400, 'Bad Request');
    }

    if (url.host !== APP_HOST) {
        return textResponse(404, 'Not Found');
    }

    let pathname: string;
    try {
        pathname = decodeURIComponent(url.pathname);
    } catch {
        return textResponse(400, 'Bad Request');
    }
    if (pathname === '' || pathname === '/') {
        pathname = '/' + INDEX_FILE;
    }

    const distDir: string = getDistDir();
    const filePath: string = path.resolve(distDir, '.' + pathname);
    if (!isPathInside(distDir, filePath)) {
        return textResponse(403, 'Forbidden');
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return textResponse(404, 'Not Found');
    }

    // net.fetch 走 Chromium 文件加载器，可读取 asar 内的文件并保留音频流式读取能力。
    return net.fetch(pathToFileURL(filePath).toString(), { bypassCustomProtocolHandlers: true })
        .catch(() => textResponse(404, 'Not Found'));
}

function getWindowIcon(): string | undefined {
    const iconPath: string = path.join(getDistDir(), 'assets', 'images', 'icon.png');
    return fs.existsSync(iconPath) ? iconPath : undefined;
}

function getStartUrl(): string {
    if (!app.isPackaged && DEV_SERVER_URL !== '') {
        return DEV_SERVER_URL;
    }
    return `${APP_SCHEME}://${APP_HOST}/${INDEX_FILE}`;
}

function isInternalUrl(url: string): boolean {
    if (url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
        return true;
    }
    return DEV_SERVER_URL !== '' && url.startsWith(DEV_SERVER_URL);
}

function openExternalUrl(url: string): void {
    if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url);
    }
}

function attachWebContentsHandlers(win: BrowserWindow): void {
    win.webContents.setWindowOpenHandler(({ url }) => {
        openExternalUrl(url);
        return { action: 'deny' };
    });

    win.webContents.on('will-navigate', (event, url) => {
        if (isInternalUrl(url)) {
            return;
        }
        event.preventDefault();
        openExternalUrl(url);
    });

    win.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') {
            return;
        }
        if (input.key === 'F11') {
            event.preventDefault();
            win.setFullScreen(!win.isFullScreen());
        } else if (input.key === 'F12' && !app.isPackaged) {
            event.preventDefault();
            win.webContents.toggleDevTools();
        }
    });
}

// Windows：setAspectRatio 只锁外框且忽略 extraSize，改为在手动缩放时按内容区 16:9 反算
// 用 setContentBounds 让 Electron 自己完成内容区↔窗口外框的换算，避免手工扣边框厚度
function resizeToContentAspect(win: BrowserWindow, newBounds: Rectangle, edge: string): void {
    const windowBounds: Rectangle = win.getBounds();
    const contentBounds: Rectangle = win.getContentBounds();
    const deltaWidth: number = newBounds.width - windowBounds.width;
    const deltaHeight: number = newBounds.height - windowBounds.height;
    // 左右边以宽度为准、上下边以高度为准，四角取变化更大的一侧
    const widthDrives: boolean = Math.abs(deltaWidth) >= Math.abs(deltaHeight);

    const contentWidth: number = Math.max(1, widthDrives
        ? contentBounds.width + deltaWidth
        : Math.round((contentBounds.height + deltaHeight) * CONTENT_ASPECT_WIDTH / CONTENT_ASPECT_HEIGHT));
    const contentHeight: number = Math.max(1, widthDrives
        ? Math.round((contentBounds.width + deltaWidth) * CONTENT_ASPECT_HEIGHT / CONTENT_ASPECT_WIDTH)
        : contentBounds.height + deltaHeight);

    win.setContentBounds({
        x: edge.includes('left') ? contentBounds.x + contentBounds.width - contentWidth : contentBounds.x,
        y: edge.includes('top') ? contentBounds.y + contentBounds.height - contentHeight : contentBounds.y,
        width: contentWidth,
        height: contentHeight,
    });
}

// 启动时按内容区 16:9 自校正一次
function fitContentAspect(win: BrowserWindow): void {
    const contentBounds: Rectangle = win.getContentBounds();
    if (contentBounds.width <= 0 || contentBounds.height <= 0) {
        return;
    }

    let width: number = contentBounds.width;
    let height: number = contentBounds.height;
    if (width * CONTENT_ASPECT_HEIGHT > height * CONTENT_ASPECT_WIDTH) {
        width = Math.round(height * CONTENT_ASPECT_WIDTH / CONTENT_ASPECT_HEIGHT);
    } else {
        height = Math.round(width * CONTENT_ASPECT_HEIGHT / CONTENT_ASPECT_WIDTH);
    }

    win.setContentBounds({
        x: contentBounds.x,
        y: contentBounds.y,
        width: Math.max(1, width),
        height: Math.max(1, height),
    });
}

function createWindow(): BrowserWindow {
    const win: BrowserWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 640,
        minHeight: 360,
        useContentSize: true,
        show: false,
        backgroundColor: '#000000',
        autoHideMenuBar: true,
        icon: getWindowIcon(),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: false,
            backgroundThrottling: false,
        },
    });

    attachWebContentsHandlers(win);

    win.once('ready-to-show', () => {
        fitContentAspect(win);
        win.show();
    });
    win.on('closed', () => {
        if (mainWindow === win) {
            mainWindow = null;
        }
    });

    if (process.platform === 'win32') {
        win.on('will-resize', (event, newBounds, details) => {
            event.preventDefault();
            resizeToContentAspect(win, newBounds, details.edge);
        });
    } else if (process.platform === 'darwin') {
        // macOS 原生 setAspectRatio 锁的就是内容区，直接使用。
        win.setAspectRatio(CONTENT_ASPECT_WIDTH / CONTENT_ASPECT_HEIGHT);
    }
    // Linux：will-resize 不会触发，无法约束内容区比例，保留系统默认行为。

    win.loadURL(getStartUrl());
    mainWindow = win;
    return win;
}

function acquireSingleInstance(): boolean {
    const hasLock: boolean = app.requestSingleInstanceLock();
    if (!hasLock) {
        app.quit();
        return false;
    }

    app.on('second-instance', () => {
        if (mainWindow === null) {
            return;
        }
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    });

    return true;
}

function onReady(): void {
    protocol.handle(APP_SCHEME, handleAppRequest);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}

function main(): void {
    if (!acquireSingleInstance()) {
        return;
    }

    app.setAppUserModelId(APP_ID);
    Menu.setApplicationMenu(null);
    registerAppScheme();

    app.whenReady().then(onReady);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

main();
