import { ApioxObject } from "./dom.js";

//包装类
export class ApioxEvent { //基础事件包装
    readonly type: string;
    readonly timeStamp: number;
    readonly target: ApioxObject | null;
    readonly currentTarget: ApioxObject | null;

    constructor(private native: Event) {
        this.type = native.type;
        this.timeStamp = native.timeStamp;
        // target / currentTarget 如果是 HTMLElement 则尝试用 id 构造 ApioxObject，否则为 null
        this.target = native.target instanceof HTMLElement ? ApioxObject.wrap(native.target) : null;
        this.currentTarget = native.currentTarget instanceof HTMLElement ? ApioxObject.wrap(native.currentTarget) : null;
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
//辅助包装函数
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

//自定义事件总线
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

//DOM 事件分发器
type AnyListener = (e: any) => void;

class DomEventManager {
    //存储结构：target -> eventType -> Set<回调函数>
    private targets = new Map<EventTarget, Map<string, Set<AnyListener>>>();

    /**
     * 注册监听
     * @param target 目标（document 或 window）
     * @param eventType 事件类型
     * @param listener 用户回调（已包装为接受原生事件的函数）
     * @returns 取消监听的函数
     */
    addListener(
        target: EventTarget,
        eventType: string,
        listener: AnyListener
    ): () => void {
        //获取或创建 target 对应的 Map
        if (!this.targets.has(target)) {
            this.targets.set(target, new Map());
        }
        const typeMap = this.targets.get(target)!;

        //获取或创建 eventType 对应的 Set
        if (!typeMap.has(eventType)) {
            typeMap.set(eventType, new Set());
        }
        const listeners = typeMap.get(eventType)!;

        //如果这个事件类型之前没有监听器，则首次注册原生监听
        if (listeners.size === 0) {
            target.addEventListener(eventType, this.getNativeHandler(target, eventType));
        }

        listeners.add(listener);

        //返回取消函数
        return () => {
            this.removeListener(target, eventType, listener);
        };
    }

    /**
     * 移除监听
     */
    removeListener(
        target: EventTarget,
        eventType: string,
        listener: AnyListener
    ): void {
        const typeMap = this.targets.get(target);
        if (!typeMap) {return;}
        const listeners = typeMap.get(eventType);
        if (!listeners) {return;}

        listeners.delete(listener);

        // 如果该事件类型没有监听器了，移除原生监听（可选）
        if (listeners.size === 0) {
            target.removeEventListener(eventType, this.getNativeHandler(target, eventType));
            typeMap.delete(eventType);
            if (typeMap.size === 0) {
                this.targets.delete(target);
            }
        }
    }

    /**
     * 获取或创建原生事件处理器（单例模式）
     * 每个 (target, eventType) 只需一个原生监听
     */
    private getNativeHandler(target: EventTarget, eventType: string): AnyListener {
        // 使用闭包缓存，确保同一个 (target, eventType) 返回同一个函数引用
        // 此处利用 Map 存储 handler 引用（简化版，可在类上增加 handlerCache）
        if (!this._handlerCache) {
            this._handlerCache = new Map<string, AnyListener>();
        }
        const key = this.getKey(target, eventType);
        if (!this._handlerCache.has(key)) {
            const handler = (nativeEvent: Event) => {
                const typeMap = this.targets.get(target);
                if (!typeMap) {return;}
                const listeners = typeMap.get(eventType);
                if (!listeners) {return;}
                // 遍历执行所有回调（注意：这里传入的是原生事件，你的包装在注册时已经完成）
                for (const cb of listeners) {
                    try {
                        cb(nativeEvent);
                    } catch (e) {
                        console.error(`Error in event listener for ${eventType}:`, e);
                    }
                }
            };
            this._handlerCache.set(key, handler);
        }
        return this._handlerCache.get(key)!;
    }

    private _handlerCache?: Map<string, AnyListener>;

    private getKey(target: EventTarget, eventType: string): string {
        // 区分 document 和 window（以及可能的其他元素）
        const id = target === document ? 'document' :
                target === window ? 'window' :
                (target as any).id || 'unknown';
        return `${id}:${eventType}`;
    }
}

export const domEventManager = new DomEventManager();

interface ApioxEventConfig {
    listenGlobal<K extends keyof WindowEventMap>(event: K, listener: (e: ApioxEvent) => void): () => void;
    listenGlobalOnce<K extends keyof WindowEventMap>(event: K, listener: (e: ApioxEvent) => void): void;
    dispatchGlobal(eventType: string, detail?: any, options?: { bubbles?: boolean; cancelable?: boolean }): boolean;
    listenWindow<K extends keyof WindowEventMap>(event: K, listener: (e: ApioxEvent) => void): () => void;

    onClick(listener: (e: ApioxMouseEvent) => void): () => void;
    onMouseMove(listener: (e: ApioxMouseEvent) => void): () => void;
    onMouseDown(listener: (e: ApioxMouseEvent) => void): () => void;
    onMouseUp(listener: (e: ApioxMouseEvent) => void): () => void;
    onContextMenu(listener: (e: ApioxMouseEvent) => void): () => void;
    onWheel(listener: (e: ApioxWheelEvent) => void): () => void;

    onKeyDown(listener: (e: ApioxKeyboardEvent) => void): () => void;
    onKeyUp(listener: (e: ApioxKeyboardEvent) => void): () => void;
    listenKeyOn(obj: ApioxObject, type: 'keydown' | 'keyup', listener: (e: ApioxKeyboardEvent) => void): () => void;
    onKeyDoubleClick(listener: (detail: { key: string }) => void): () => void;
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
    ): boolean;
}

//对外 API
export const apioxEvent: ApioxEventConfig = {
    listenGlobal<K extends keyof WindowEventMap>( //监听document
        event: K,
        listener: (e: ApioxEvent) => void
    ): () => void {
        const wrapped = wrapEvent(listener);
        domEventManager.addListener(document, event, wrapped);
        return () => domEventManager.removeListener(document, event, wrapped);
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
        domEventManager.addListener(window, event, wrapped);
        return () => domEventManager.removeListener(window, event, wrapped);
    },

    //鼠标事件
    onClick(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        domEventManager.addListener(document, 'click', wrapped);
        return () => domEventManager.removeListener(document, 'click', wrapped);
    },
    onMouseMove(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        domEventManager.addListener(document, 'mousemove', wrapped);
        return () => domEventManager.removeListener(document, 'mousemove', wrapped);
    },
    onMouseDown(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        domEventManager.addListener(document, 'mousedown', wrapped);
        return () => domEventManager.removeListener(document, 'mousedown', wrapped);
    },
    onMouseUp(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        domEventManager.addListener(document, 'mouseup', wrapped);
        return () => domEventManager.removeListener(document, 'mouseup', wrapped);
    },
    onContextMenu(listener: (e: ApioxMouseEvent) => void): () => void {
        const wrapped = wrapMouse(listener);
        domEventManager.addListener(document, 'contextmenu', wrapped);
        return () => domEventManager.removeListener(document, 'contextmenu', wrapped);
    },

    onWheel(listener: (e: ApioxWheelEvent) => void): () => void {
        const wrapped = wrapWheel(listener);
        domEventManager.addListener(document, 'wheel', wrapped);
        return () => domEventManager.removeListener(document, 'wheel', wrapped);
    },

    //键盘事件
    onKeyDown(listener: (e: ApioxKeyboardEvent) => void): () => void {
        const wrapped = wrapKeyboard(listener);
        domEventManager.addListener(document, 'keydown', wrapped);
        return () => domEventManager.removeListener(document, 'keydown', wrapped);
    },
    onKeyUp(listener: (e: ApioxKeyboardEvent) => void): () => void {
        const wrapped = wrapKeyboard(listener);
        domEventManager.addListener(document, 'keyup', wrapped);
        return () => domEventManager.removeListener(document, 'keyup', wrapped);
    },

    //为特定的 ApioxObject 添加键盘监听
    listenKeyOn(
        obj: ApioxObject,
        type: 'keydown' | 'keyup',
        listener: (e: ApioxKeyboardEvent) => void
    ): () => void {
        return obj.on(type, listener as (ev: ApioxAnyEvent) => void);
    },

    //自定义事件（由 enableKeyDoubleClickDetection 触发）
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