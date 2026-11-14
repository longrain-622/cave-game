import { apioxNet } from '../../apiox/net.js';
import { apioxTime } from '../../apiox/time.js';
import { reloadPage } from '../../apiox/method.js';
import { player, playerState } from '../player.js';
import { inventory, widgets } from '../gui/gameGUI/inventory.js';
import { Slots } from '../gui/gameGUI/inventoryConfig.js';
import { clock } from '../nature/sky.js';
import { chunk, isOutOfBounds, lightPos, loadPalette, pushChunkToWorld, world } from '../world.js';
import { eventBus } from '../others/eventBus.js';
import type {
    InventoryStateMessage,
    LanEvent,
    PlayerStateMessage,
    WorldChunkMessage,
    WorldDiffMessage,
} from '../../../shared/netProtocol.js';

const SNAP_DISTANCE_PX: number = 5 * 64;
const INTERPOLATION_RATE: number = 0.25;

let active: boolean = false;
let disconnected: boolean = false;
let offEvents: (() => void) | null = null;
let targetX: number = 0;
let targetY: number = 0;

function handleDisconnect(reason: string): void {
    if (disconnected) {return;}
    disconnected = true;

    console.warn('LAN connection ended:', reason);
    void apioxNet.leave().catch((): void => {});

    apioxTime.setOut((): void => {
        reloadPage();
    }, 800);
}

function applyPlayerState(message: PlayerStateMessage): void {
    player.hp = message.hp;
    player.face = message.face;
    player.acc = message.acc;
    player.leg_rad = message.legRad;
    player.hand_rad = message.handRad;
    player.needRotateHand = message.needRotateHand;
    player.isRotateRighthand = message.isRotateRighthand;
    player.rightOnMouse = message.rightOnMouse;
    player.state = message.state as playerState;
    widgets.select = message.selectedSlot;

    targetX = message.x;
    targetY = message.y;

    if (Math.abs(player.x - targetX) > SNAP_DISTANCE_PX || Math.abs(player.y - targetY) > SNAP_DISTANCE_PX) {
        player.x = targetX;
        player.y = targetY;
    }
}

function applyInventoryState(message: InventoryStateMessage): void {
    inventory.items.length = 0;
    for (const slot of message.items) {
        inventory.items.push(new Slots(slot.item, slot.num, slot.durability));
    }
    widgets.select = message.selectedSlot;
}

function applyWorldDiff(message: WorldDiffMessage): void {
    loadPalette(message.palette);

    for (const cell of message.cells) {
        if (isOutOfBounds(cell.y, cell.x)) {continue;}
        world[cell.y][cell.x] = cell.index;
        lightPos.push(
            { x: cell.x, y: cell.y },
            { x: cell.x - 1, y: cell.y },
            { x: cell.x + 1, y: cell.y },
            { x: cell.x, y: cell.y - 1 },
            { x: cell.x, y: cell.y + 1 }
        );
    }
}

function applyWorldChunk(message: WorldChunkMessage): void {
    loadPalette(message.palette);
    pushChunkToWorld(message.chunkData, message.behind);
    chunk.num = message.chunkNum;
    chunk.start_x = message.chunkStartX;
    chunk.left_number = message.chunkLeftNumber;

    if (!message.behind) {
        targetX += chunk.width * 64;
    }

    eventBus.emit('chunk:create', message.behind);
}

function handleEvent(event: LanEvent): void {
    switch (event.type) {
        case 'player:state':
            applyPlayerState(event.data);
            break;
        case 'inventory:state':
            applyInventoryState(event.data);
            break;
        case 'world:diff':
            applyWorldDiff(event.data);
            break;
        case 'world:chunk':
            applyWorldChunk(event.data);
            break;
        case 'time':
            clock.timer = event.timer;
            break;
        case 'host:stop':
            handleDisconnect(event.reason ?? 'host stopped');
            break;
        case 'net:error':
            handleDisconnect(event.message);
            break;
        default:
            break;
    }
}

export function startClientNet(): void {
    if (active) {return;}
    active = true;
    disconnected = false;
    targetX = player.x;
    targetY = player.y;
    offEvents = apioxNet.onEvent(handleEvent);
}

export function clientNetTick(delta: number): void {
    if (!active) {return;}

    const distanceX: number = targetX - player.x;
    const distanceY: number = targetY - player.y;
    if (Math.abs(distanceX) > SNAP_DISTANCE_PX || Math.abs(distanceY) > SNAP_DISTANCE_PX) {
        player.x = targetX;
        player.y = targetY;
        return;
    }

    const t: number = Math.min(1, Math.max(0, delta * INTERPOLATION_RATE));
    player.x += distanceX * t;
    player.y += distanceY * t;
}

export function stopClientNet(): void {
    if (!active) {return;}
    active = false;

    if (offEvents !== null) {
        offEvents();
        offEvents = null;
    }
}
