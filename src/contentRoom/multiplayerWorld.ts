import * as PIXI from 'pixi.js';
import { ApioxObject, apiObjects } from '../apiox/dom.js';
import { ApioxKeyboardEvent } from '../apiox/event.js';
import { apiMethod } from '../apiox/method.js';
import { win } from '../apiox/global.js';
import { room } from '../constants/generic.js';
import { textStyle1 } from '../constants/pixiStyles.js';
import { getContentApp, showArchiveSurface, showStartSurface } from './contentRenderer.js';

// 与单人世界列表保持一致的行布局参数
const BLACKBG_HEIGHT: number = Math.floor(room.height * 0.6);
const ROW_MARGIN: number = 20;
const ROW_HEIGHT: number = 72;
const ROW_GAP: number = 8;
const TEXT_LEFT: number = 12;
const NAME_FONT_SIZE: number = 20;
const SUB_FONT_SIZE: number = 18;
const NAME_Y: number = ROW_HEIGHT - NAME_FONT_SIZE - SUB_FONT_SIZE - 6;
const SUB_Y: number = ROW_HEIGHT - SUB_FONT_SIZE - 2;
const SCROLLBAR_WIDTH: number = 16;
const SCROLLBAR_MARGIN: number = 0;
const DEFAULT_PORT: number = 2567;
const LAN_MOCK_KEY: string = 'cavegame_lan_mock';

export interface LanWorldEntry {
    id: string;
    worldName: string;
    hostName: string;
    players: number;
    maxPlayers: number;
    address: string;
    port: number;
}

interface WorldRow {
    container: PIXI.Container;
    background: PIXI.Graphics;
    width: number;
    entry: LanWorldEntry;
}

interface UiRefs {
    app: PIXI.Application;
    layer: PIXI.Container;
    listContainer: PIXI.Container;
    scrollThumb: PIXI.Graphics;
    worldwindow: ApioxObject;
    editWorld: ApioxObject;
    worldCreator: ApioxObject;
    multiplayerWorld: ApioxObject;
    directPanel: ApioxObject;
    noWorlds: ApioxObject;
    hint: ApioxObject;
    status: ApioxObject;
    joinBtn: ApioxObject;
    directBtn: ApioxObject;
    refreshBtn: ApioxObject;
    exitBtn: ApioxObject;
    connectBtn: ApioxObject;
    cancelBtn: ApioxObject;
    addressInput: ApioxObject;
}

// 开发预览数据：仅在 dev 且 localStorage.cavegame_lan_mock = '1' 时显示
const MOCK_LAN_WORLDS: LanWorldEntry[] = [
    { id: 'lan-mock-1', worldName: 'Cave World', hostName: 'Steve', players: 1, maxPlayers: 4, address: '192.168.1.10', port: 2567 },
    { id: 'lan-mock-2', worldName: 'The Long Night', hostName: 'Alex', players: 2, maxPlayers: 4, address: '192.168.1.11', port: 2567 },
    { id: 'lan-mock-3', worldName: '挖矿基地', hostName: 'LongRain', players: 1, maxPlayers: 4, address: '192.168.1.12', port: 2567 },
    { id: 'lan-mock-4', worldName: 'Snow Peak', hostName: 'Huang', players: 3, maxPlayers: 4, address: '192.168.1.13', port: 2567 },
    { id: 'lan-mock-5', worldName: 'Desert Cave', hostName: 'Notch', players: 1, maxPlayers: 4, address: '192.168.1.14', port: 2567 },
    { id: 'lan-mock-6', worldName: 'Test World', hostName: 'Player', players: 2, maxPlayers: 4, address: '192.168.1.15', port: 2567 },
    { id: 'lan-mock-7', worldName: '像素冒险', hostName: 'Kai', players: 4, maxPlayers: 4, address: '192.168.1.16', port: 2567 },
];

let ui: UiRefs | null = null;
let rows: WorldRow[] = [];
let currentWorlds: LanWorldEntry[] = [];
let selectedId: string | null = null;
let scrollY: number = 0;
let maxScroll: number = 0;
let dragData: { startY: number; startScroll: number } | null = null;

function getUi(): UiRefs {
    if (ui === null) {
        throw new Error('[multiplayerWorld] UI is not initialized');
    }
    return ui;
}

function getText(path: string): string {
    const t = apiObjects.win.t;
    return t ? t(path) : path;
}

function setStatus(text: string): void {
    getUi().status.domProperty('textContent', text);
}

function readLanWorlds(): LanWorldEntry[] {
    if (import.meta.env.DEV && win.storage.get(LAN_MOCK_KEY) === '1') {
        return MOCK_LAN_WORLDS;
    }
    return [];
}

function formatAddress(entry: LanWorldEntry): string {
    return entry.address + ':' + entry.port;
}

function parseManualAddress(raw: string): { address: string; port: number } | null {
    const text: string = raw.trim();
    if (text === '') {return null;}

    const match: RegExpExecArray | null = /^([^\s:]+)(?::(\d{1,5}))?$/.exec(text);
    if (match === null) {return null;}

    const port: number = match[2] === undefined ? DEFAULT_PORT : Number(match[2]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {return null;}

    return { address: match[1], port: port };
}

function drawRowBackground(background: PIXI.Graphics, width: number, selected: boolean): void {
    background.clear();
    if (!selected) {return;}

    background.lineStyle(2, 0x808080, 1);
    background.beginFill(0x000000, 0.4);
    background.drawRect(0, 0, width, ROW_HEIGHT);
    background.endFill();
}

function redrawSelection(): void {
    for (const row of rows) {
        drawRowBackground(row.background, row.width, row.entry.id === selectedId);
    }
}

function updateJoinButton(): void {
    getUi().joinBtn.domProperty('disabled', selectedId === null);
}

function updateScrollbar(): void {
    const u = getUi();
    const viewHeight: number = u.app.screen.height;
    const totalHeight: number = rows.length * (ROW_HEIGHT + ROW_GAP) + 8;
    maxScroll = Math.max(0, totalHeight - viewHeight);

    u.scrollThumb.clear();
    u.scrollThumb.eventMode = 'none';

    if (maxScroll <= 0) {
        scrollY = 0;
        u.listContainer.position.y = 0;
        return;
    }

    const thumbHeight: number = Math.max(24, viewHeight * (viewHeight / totalHeight));
    const thumbY: number = (scrollY / maxScroll) * (viewHeight - thumbHeight);
    const thumbX: number = u.app.screen.width - SCROLLBAR_WIDTH - SCROLLBAR_MARGIN;

    u.scrollThumb.beginFill(0x999999, 0.8);
    u.scrollThumb.drawRect(thumbX, thumbY, SCROLLBAR_WIDTH, thumbHeight);
    u.scrollThumb.endFill();
    u.scrollThumb.eventMode = 'static';
    u.scrollThumb.cursor = 'pointer';
}

function handleWheel(event: PIXI.FederatedWheelEvent): void {
    const u = ui;
    if (u === null || !u.layer.visible || maxScroll <= 0) {return;}

    const step: number = event.deltaY > 0 ? ROW_HEIGHT : -ROW_HEIGHT;
    scrollY = Math.max(0, Math.min(maxScroll, scrollY + step));
    u.listContainer.position.y = -Math.floor(scrollY);
    updateScrollbar();
}

function handlePointerMove(event: PIXI.FederatedPointerEvent): void {
    const u = ui;
    if (u === null || dragData === null) {return;}

    const viewHeight: number = u.app.screen.height;
    const totalHeight: number = rows.length * (ROW_HEIGHT + ROW_GAP) + 8;
    const scrollable: number = Math.max(0, totalHeight - viewHeight);
    if (scrollable <= 0) {return;}

    const thumbHeight: number = Math.max(24, viewHeight * (viewHeight / totalHeight));
    if (viewHeight - thumbHeight <= 0) {return;}

    const deltaY: number = event.global.y - dragData.startY;
    scrollY = Math.max(0, Math.min(scrollable, dragData.startScroll + (deltaY / (viewHeight - thumbHeight)) * scrollable));
    u.listContainer.position.y = -Math.floor(scrollY);
    updateScrollbar();
}

function handlePointerUp(): void {
    dragData = null;
}

function createWorldRow(entry: LanWorldEntry, width: number): WorldRow {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, width, ROW_HEIGHT);

    const background = new PIXI.Graphics();
    container.addChild(background);

    const nameText = new PIXI.Text(entry.worldName, textStyle1(NAME_FONT_SIZE));
    nameText.position.set(TEXT_LEFT, NAME_Y);
    container.addChild(nameText);

    const subText = new PIXI.Text(entry.hostName + ' · ' + entry.players + '/' + entry.maxPlayers, textStyle1(SUB_FONT_SIZE));
    subText.style.fill = '#aaaaaa';
    subText.position.set(TEXT_LEFT, SUB_Y);
    container.addChild(subText);

    const addressText = new PIXI.Text(formatAddress(entry), textStyle1(SUB_FONT_SIZE));
    addressText.style.fill = '#888888';
    addressText.anchor.set(1, 0);
    addressText.position.set(width - TEXT_LEFT, SUB_Y);
    container.addChild(addressText);

    container.on('pointerdown', (): void => { selectWorld(entry); });

    return { container: container, background: background, width: width, entry: entry };
}

function renderWorldList(worlds: LanWorldEntry[]): void {
    const u = getUi();
    const oldChildren = u.listContainer.removeChildren();
    for (const child of oldChildren) {
        child.destroy({ children: true });
    }
    rows = [];

    if (worlds.length === 0) {
        u.noWorlds.show('block');
        u.hint.show('block');
        scrollY = 0;
        u.listContainer.position.y = 0;
        updateScrollbar();
        return;
    }

    u.noWorlds.hide();
    u.hint.hide();

    const rowWidth: number = u.app.screen.width - ROW_MARGIN * 2;
    let y: number = 8;

    for (const entry of worlds) {
        const row: WorldRow = createWorldRow(entry, rowWidth);
        row.container.position.set(ROW_MARGIN, y);
        u.listContainer.addChild(row.container);
        rows.push(row);
        y += ROW_HEIGHT + ROW_GAP;
    }

    const totalHeight: number = rows.length * (ROW_HEIGHT + ROW_GAP) + 8;
    maxScroll = Math.max(0, totalHeight - u.app.screen.height);
    scrollY = Math.min(scrollY, maxScroll);
    u.listContainer.position.y = -Math.floor(scrollY);
    redrawSelection();
    updateScrollbar();
}

function refreshWorldList(): void {
    currentWorlds = readLanWorlds();
    if (selectedId !== null && !currentWorlds.some((entry: LanWorldEntry): boolean => entry.id === selectedId)) {
        selectedId = null;
    }
    renderWorldList(currentWorlds);
    updateJoinButton();
}

function selectWorld(entry: LanWorldEntry): void {
    selectedId = entry.id;
    redrawSelection();
    updateJoinButton();
    setStatus(getText('multiplayer.selected') + ': ' + entry.worldName);
}

function joinSelected(): void {
    const entry: LanWorldEntry | undefined = currentWorlds.find((world: LanWorldEntry): boolean => world.id === selectedId);
    if (entry === undefined) {return;}

    setStatus(getText('multiplayer.selected') + ': ' + entry.worldName + ' — ' + getText('multiplayer.joinPending'));
}

function openDirectPanel(): void {
    const u = getUi();
    u.addressInput.domProperty('value', '');
    u.directPanel.show('block');
    setStatus('');
}

function closeDirectPanel(): void {
    getUi().directPanel.hide();
    setStatus('');
}

function connectManual(): void {
    const u = getUi();
    const raw: string = String(u.addressInput.getProperty('value') ?? '');
    const target: { address: string; port: number } | null = parseManualAddress(raw);

    if (target === null) {
        setStatus(getText('multiplayer.invalidAddress'));
        return;
    }

    u.directPanel.hide();
    setStatus(getText('multiplayer.directConnect') + ': ' + target.address + ':' + target.port + ' — ' + getText('multiplayer.joinPending'));
}

export function showMultiplayerWorld(): void {
    const u = getUi();

    u.worldwindow.show();
    u.editWorld.hide();
    u.worldCreator.hide();
    u.multiplayerWorld.show('block');
    u.directPanel.hide();
    u.layer.visible = true;

    const blackbg: Element | null = apiMethod.select('#multiplayer-blackbg');
    if (blackbg !== null) {
        showArchiveSurface(blackbg, room.width, BLACKBG_HEIGHT);
    }

    setStatus('');
    refreshWorldList();
}

export function hideMultiplayerWorld(): void {
    const u = getUi();

    u.directPanel.hide();
    u.multiplayerWorld.hide();
    u.worldwindow.hide();
    u.layer.visible = false;
    u.editWorld.show();
    u.worldCreator.hide();
    dragData = null;
    setStatus('');
    showStartSurface();
}

function main(): void {
    const app: PIXI.Application = getContentApp();

    const layer = new PIXI.Container();
    layer.zIndex = 30;
    layer.visible = false;
    app.stage.addChild(layer);

    // 仅用于捕获列表空白区域的滚轮/指针事件，不绘制可见背景（背景由 CSS 提供）
    const wheelCatcher = new PIXI.Graphics();
    wheelCatcher.beginFill(0x000000, 0.001);
    wheelCatcher.drawRect(0, 0, room.width, BLACKBG_HEIGHT);
    wheelCatcher.endFill();
    wheelCatcher.eventMode = 'static';
    wheelCatcher.cursor = 'default';
    layer.addChild(wheelCatcher);

    const listContainer = new PIXI.Container();
    listContainer.eventMode = 'static';
    layer.addChild(listContainer);

    const scrollThumb = new PIXI.Graphics();
    layer.addChild(scrollThumb);

    wheelCatcher.on('wheel', (event: PIXI.FederatedWheelEvent): void => { handleWheel(event); });
    listContainer.on('wheel', (event: PIXI.FederatedWheelEvent): void => { handleWheel(event); });
    scrollThumb.on('wheel', (event: PIXI.FederatedWheelEvent): void => { handleWheel(event); });
    app.stage.on('pointermove', handlePointerMove);
    app.stage.on('pointerup', handlePointerUp);
    app.stage.on('pointerupoutside', handlePointerUp);

    const refs: UiRefs = {
        app: app,
        layer: layer,
        listContainer: listContainer,
        scrollThumb: scrollThumb,
        worldwindow: new ApioxObject('worldwindow'),
        editWorld: new ApioxObject('editWorld'),
        worldCreator: new ApioxObject('worldCreator'),
        multiplayerWorld: new ApioxObject('multiplayerWorld'),
        directPanel: new ApioxObject('multiplayerDirectPanel'),
        noWorlds: new ApioxObject('multiplayerNoWorlds'),
        hint: new ApioxObject('multiplayerHint'),
        status: new ApioxObject('multiplayerStatus'),
        joinBtn: new ApioxObject('multiplayerJoinBtn'),
        directBtn: new ApioxObject('multiplayerDirectBtn'),
        refreshBtn: new ApioxObject('multiplayerRefreshBtn'),
        exitBtn: new ApioxObject('multiplayerExitBtn'),
        connectBtn: new ApioxObject('multiplayerConnectBtn'),
        cancelBtn: new ApioxObject('multiplayerCancelBtn'),
        addressInput: new ApioxObject('multiplayerAddress'),
    };
    ui = refs;

    refs.joinBtn.on('click', (): void => { joinSelected(); });
    refs.directBtn.on('click', (): void => { openDirectPanel(); });
    refs.refreshBtn.on('click', (): void => { refreshWorldList(); });
    refs.exitBtn.on('click', (): void => { hideMultiplayerWorld(); });
    refs.connectBtn.on('click', (): void => { connectManual(); });
    refs.cancelBtn.on('click', (): void => { closeDirectPanel(); });
    refs.addressInput.on('keydown', (event): void => {
        const keyEvent = event as ApioxKeyboardEvent;
        if (keyEvent.key === 'Enter') {
            connectManual();
        } else if (keyEvent.key === 'Escape') {
            closeDirectPanel();
        }
    });
    refs.scrollThumb.on('pointerdown', (event: PIXI.FederatedPointerEvent): void => {
        dragData = { startY: event.global.y, startScroll: scrollY };
        event.stopPropagation();
    });

    refs.multiplayerWorld.hide();
    refs.directPanel.hide();
    refreshWorldList();
}

main();
