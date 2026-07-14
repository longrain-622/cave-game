import { ApioxObject } from "./dom.js";

// ========== 包装类 ==========
export class ApioxEvent { //基础事件包装
    readonly type: string;
    readonly timeStamp: number;
    readonly target: ApioxObject | null;
    readonly currentTarget: ApioxObject | null;

    constructor(private native: Event) {
        this.type = native.type;
        this.timeStamp = native.timeStamp;
        // target / currentTarget 如果是 HTMLElement 则尝试用 id 构造 ApioxObject，否则为 null
        this.target = native.target instanceof HTMLElement ? new ApioxObject(native.target.id) : null;
        this.currentTarget = native.currentTarget instanceof HTMLElement ? new ApioxObject(native.currentTarget.id) : null;
    }

    preventDefault(): void { this.native.preventDefault(); }
    stopPropagation(): void { this.native.stopPropagation(); }
    stopImmediatePropagation(): void { this.native.stopImmediatePropagation(); }
}

export class ApioxMouseEvent {
    readonly type: string;
    readonly timeStamp: number;
    readonly target: ApioxObject | null;
    readonly currentTarget: ApioxObject | null;
    readonly clientX: number;
    readonly clientY: number;
    readonly button: number;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly metaKey: boolean;

    constructor(private native: MouseEvent) {
        this.type = native.type;
        this.timeStamp = native.timeStamp;
        this.target = native.target instanceof HTMLElement ? ApioxObject.wrap(native.target) : null;
        this.currentTarget = native.currentTarget instanceof HTMLElement ? ApioxObject.wrap(native.currentTarget) : null;
        this.clientX = native.clientX;
        this.clientY = native.clientY;
        this.button = native.button;
        this.altKey = native.altKey;
        this.ctrlKey = native.ctrlKey;
        this.shiftKey = native.shiftKey;
        this.metaKey = native.metaKey;
    }

    preventDefault(): void { this.native.preventDefault(); }
    stopPropagation(): void { this.native.stopPropagation(); }
}

export class ApioxWheelEvent {
    readonly type: string;
    readonly timeStamp: number;
    readonly target: ApioxObject | null;
    readonly currentTarget: ApioxObject | null;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly deltaZ: number;
    readonly deltaMode: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly button: number;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly metaKey: boolean;

    constructor(private native: WheelEvent) {
        this.type = native.type;
        this.timeStamp = native.timeStamp;
        this.target = native.target instanceof HTMLElement ? ApioxObject.wrap(native.target) : null;
        this.currentTarget = native.currentTarget instanceof HTMLElement ? ApioxObject.wrap(native.currentTarget) : null;
        this.deltaX = native.deltaX;
        this.deltaY = native.deltaY;
        this.deltaZ = native.deltaZ;
        this.deltaMode = native.deltaMode;
        this.clientX = native.clientX;
        this.clientY = native.clientY;
        this.button = native.button;
        this.altKey = native.altKey;
        this.ctrlKey = native.ctrlKey;
        this.shiftKey = native.shiftKey;
        this.metaKey = native.metaKey;
    }

    preventDefault(): void { this.native.preventDefault(); }
    stopPropagation(): void { this.native.stopPropagation(); }
}

export class ApioxKeyboardEvent {
    readonly type: string;
    readonly timeStamp: number;
    readonly target: ApioxObject | null;
    readonly currentTarget: ApioxObject | null;
    readonly key: string;
    readonly code: string;
    readonly repeat: boolean;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly metaKey: boolean;

    constructor(private native: KeyboardEvent) {
        this.type = native.type;
        this.timeStamp = native.timeStamp;
        this.target = native.target instanceof HTMLElement 
            ? ApioxObject.wrap(native.target)   // 需要 ApioxObject.wrap 方法
            : null;
        this.currentTarget = native.currentTarget instanceof HTMLElement 
            ? ApioxObject.wrap(native.currentTarget)
            : null;
        this.key = native.key;
        this.code = native.code;
        this.repeat = native.repeat;
        this.altKey = native.altKey;
        this.ctrlKey = native.ctrlKey;
        this.shiftKey = native.shiftKey;
        this.metaKey = native.metaKey;
    }

    preventDefault(): void { this.native.preventDefault(); }
    stopPropagation(): void { this.native.stopPropagation(); }
}
// ========== 辅助包装函数 ==========
function wrapEvent(listener: (e: ApioxEvent) => void): (e: Event) => void {
    return (native) => listener(new ApioxEvent(native));
}

function wrapMouse(listener: (e: ApioxMouseEvent) => void): (e: MouseEvent) => void {
    return (native) => listener(new ApioxMouseEvent(native));
}

function wrapWheel(listener: (e: ApioxWheelEvent) => void): (e: WheelEvent) => void {
    return (native) => listener(new ApioxWheelEvent(native));
}

function wrapKeyboard(listener: (e: ApioxKeyboardEvent) => void): (e: KeyboardEvent) => void {
    return (native) => listener(new ApioxKeyboardEvent(native));
}

// ========== 自定义事件总线 ==========
type Listener<T = any> = (detail: T) => void;
export type ApioxAnyEvent = ApioxEvent | ApioxMouseEvent | ApioxKeyboardEvent | ApioxWheelEvent;
class ApioxEventBus {
    private listeners = new Map<string, Set<Listener>>();
    on<T>(event: string, cb: Listener<T>): () => void {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(cb as Listener);
        return () => this.off(event, cb as Listener);
    }
    off<T>(event: string, cb: Listener<T>): void {
        this.listeners.get(event)?.delete(cb as Listener);
    }
    emit<T>(event: string, detail: T): void {
        this.listeners.get(event)?.forEach(cb => cb(detail));
    }
}
export const apioxEventBus = new ApioxEventBus();

// ========== 对外 API ==========
export const apioxEvent = {
    listenGlobal<K extends keyof WindowEventMap>( //监听document
        event: K,
        listener: (e: ApioxEvent) => void
    ): () => void {
        const wrapped = wrapEvent(listener);
        document.addEventListener(event, wrapped);
        return () => document.removeEventListener(event, wrapped);
    },

    listenGlobalOnce<K extends keyof WindowEventMap>(
        event: K,
        listener: (e: ApioxEvent) => void
    ): void {
        const wrapped = wrapEvent((e: ApioxEvent) => {
            listener(e);
            document.removeEventListener(event, wrapped); //触发后立即移除自身
        });
        document.addEventListener(event, wrapped, { once: true }); //利用原生once
    },

    /**
     * 在 document 上分派自定义事件
     * @param eventType 事件类型字符串
     * @param detail 自定义数据（可选）
     * @param options 额外选项（bubbles, cancelable）
     * @returns 是否被取消（false 表示 preventDefault 被调用）
     */
    dispatchGlobal(
        eventType: string,
        detail?: any,
        options?: { bubbles?: boolean; cancelable?: boolean }
    ): boolean {
        const event = new CustomEvent(eventType, {
            detail,
            bubbles: options?.bubbles ?? true,
            cancelable: options?.cancelable ?? true,
        });
        return document.dispatchEvent(event);
    },

    listenWindow<K extends keyof WindowEventMap>( //监听window
        event: K,
        listener: (e: ApioxEvent) => void
    ): () => void {
        const wrapped = wrapEvent(listener);
        window.addEventListener(event, wrapped);
        return () => window.removeEventListener(event, wrapped);
    },

    //鼠标事件
    onClick(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        document.addEventListener('click', wrapped);
        return () => document.removeEventListener('click', wrapped);
    },
    onMouseMove(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        document.addEventListener('mousemove', wrapped);
        return () => document.removeEventListener('mousemove', wrapped);
    },
    onMouseDown(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        document.addEventListener('mousedown', wrapped);
        return () => document.removeEventListener('mousedown', wrapped);
    },
    onMouseUp(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        document.addEventListener('mouseup', wrapped);
        return () => document.removeEventListener('mouseup', wrapped);
    },
    onContextMenu(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        document.addEventListener('contextmenu', wrapped);
        return () => document.removeEventListener('contextmenu', wrapped);
    },

    onWheel(listener: (e: ApioxWheelEvent) => void): () => void {
        const wrapped = wrapWheel(listener);
        document.addEventListener('wheel', wrapped);
        return () => document.removeEventListener('wheel', wrapped);
    },

    // 键盘事件
    onKeyDown(listener: (e: ApioxKeyboardEvent) => void): () => void {
        const wrapped = wrapKeyboard(listener);
        document.addEventListener('keydown', wrapped);
        return () => document.removeEventListener('keydown', wrapped);
    },
    onKeyUp(listener: (e: ApioxKeyboardEvent) => void): () => void {
        const wrapped = wrapKeyboard(listener);
        document.addEventListener('keyup', wrapped);
        return () => document.removeEventListener('keyup', wrapped);
    },

    // 为特定的 ApioxObject 添加键盘监听
    listenKeyOn(
        obj: ApioxObject,
        type: 'keydown' | 'keyup',
        listener: (e: ApioxKeyboardEvent) => void
    ): () => void {
        return obj.on(type, listener as (ev: ApioxAnyEvent) => void);
    },

    // 自定义事件（由 enableKeyDoubleClickDetection 触发）
    onKeyDoubleClick(listener: (detail: { key: string }) => void): () => void {
        return apioxEventBus.on('keydoubleclick', listener);
    },

    dispatchKeyboard(
        type: 'keydown' | 'keyup' | 'keypress',
        key: string,
        options?: {
            code?: string;
            keyCode?: number;
            ctrlKey?: boolean;
            shiftKey?: boolean;
            altKey?: boolean;
            metaKey?: boolean;
            bubbles?: boolean;
            cancelable?: boolean;
            composed?: boolean;
        }
    ): boolean {
        const event = new KeyboardEvent(type, {
            key: key,
            code: options?.code || 'Key' + key.toUpperCase(),
            keyCode: options?.keyCode || key.toUpperCase().charCodeAt(0),
            ctrlKey: options?.ctrlKey || false,
            shiftKey: options?.shiftKey || false,
            altKey: options?.altKey || false,
            metaKey: options?.metaKey || false,
            bubbles: options?.bubbles ?? true,
            cancelable: options?.cancelable ?? true,
            composed: options?.composed ?? true,
        });
        return document.dispatchEvent(event);
    }
};