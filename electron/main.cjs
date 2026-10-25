// Electron 主进程：加载 Vite 构建产物，并负责窗口与协议层。
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.sinuxu.cavegame';
const APP_SCHEME = 'app';
const APP_HOST = 'cavegame';
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || '';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const INDEX_FILE = 'index.html';

let mainWindow = null;

function isPathInside(root, target) {
    const relative = path.relative(root, target);
    return relative !== ''
        && relative !== '..'
        && !relative.startsWith('..' + path.sep)
        && !path.isAbsolute(relative);
}

function textResponse(status, message) {
    return new Response(message, {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
}

function registerAppScheme() {
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

function handleAppRequest(request) {
    let url;
    try {
        url = new URL(request.url);
    } catch {
        return textResponse(400, 'Bad Request');
    }

    if (url.host !== APP_HOST) {
        return textResponse(404, 'Not Found');
    }

    let pathname;
    try {
        pathname = decodeURIComponent(url.pathname);
    } catch {
        return textResponse(400, 'Bad Request');
    }
    if (pathname === '' || pathname === '/') {
        pathname = '/' + INDEX_FILE;
    }

    const filePath = path.resolve(DIST_DIR, '.' + pathname);
    if (!isPathInside(DIST_DIR, filePath)) {
        return textResponse(403, 'Forbidden');
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return textResponse(404, 'Not Found');
    }

    // net.fetch 走 Chromium 文件加载器，可读取 asar 内的文件并保留音频流式读取能力。
    return net.fetch(pathToFileURL(filePath).toString(), { bypassCustomProtocolHandlers: true })
        .catch(() => textResponse(404, 'Not Found'));
}

function getWindowIcon() {
    const iconPath = path.join(DIST_DIR, 'assets', 'images', 'icon.png');
    return fs.existsSync(iconPath) ? iconPath : undefined;
}

function getStartUrl() {
    if (!app.isPackaged && DEV_SERVER_URL !== '') {
        return DEV_SERVER_URL;
    }
    return `${APP_SCHEME}://${APP_HOST}/${INDEX_FILE}`;
}

function isInternalUrl(url) {
    if (url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
        return true;
    }
    return DEV_SERVER_URL !== '' && url.startsWith(DEV_SERVER_URL);
}

function openExternalUrl(url) {
    if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url);
    }
}

function attachWebContentsHandlers(win) {
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

function createWindow() {
    const win = new BrowserWindow({
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
        win.show();
    });
    win.on('closed', () => {
        if (mainWindow === win) {
            mainWindow = null;
        }
    });

    win.loadURL(getStartUrl());
    mainWindow = win;
    return win;
}

function acquireSingleInstance() {
    const hasLock = app.requestSingleInstanceLock();
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

function onReady() {
    protocol.handle(APP_SCHEME, handleAppRequest);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}

function main() {
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
