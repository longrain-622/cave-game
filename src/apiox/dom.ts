import { ApioxEvent, ApioxKeyboardEvent, ApioxMouseEvent, ApioxWheelEvent, ApioxAnyEvent } from "./event.js";
import { ApioxCanvasContext } from "./canvas.js";

export class ApioxObject {
    id: string; className: string;

    private element: HTMLElement;
    private _listeners: Map<string, Map<Function, EventListener>> = new Map();
    private rect: DOMRect;

    constructor(id: string | null = null, className: string | null = null) {
        this.id = id; this.className = className;
        if(id !== null) {this.element = document.getElementById(id);}
        else if(className !== null) {
            const elements = document.getElementsByClassName(className);
            if (elements.length > 0) {
                this.element = elements[0] as HTMLElement;
            } else {
                throw new Error(`No element found with class "${className}"`);
            }
        } else {
            throw new Error('Either id or className must be provided');
        }

        if (this.element) {
            this.rect = this.element.getBoundingClientRect();
        } else {
            throw new Error(
                `[ApioxObject] cannot get the element (id="${id}", class="${className}")。\n`
            );
        }
    }

    domstyle(prop: string, value?: string | null): string;
    domstyle(props: Record<string, string>): void;
    domstyle(propOrProps: string | Record<string, string>, value?: string | null): string | void {
        if (typeof propOrProps === 'string') {
            if (value !== undefined && value !== null) {
                this.element.style.setProperty(propOrProps, value);
            }
            return this.element.style.getPropertyValue(propOrProps);
        } else {
            //批量设置
            const props = propOrProps;
            for (const [key, val] of Object.entries(props)) {
                this.element.style.setProperty(key, val);
            }
            //批量设置时不返回值
        }
    }

    getStyle(prop: string): string {
        return this.element.style.getPropertyValue(prop);
    }

    domProperty(prop: string, value: any=null): any {
        if(value !== null) {
            (this.element as any)[prop] = value;
        }
        return (this.element as any)[prop];
    }

    getProperty(prop: any): any {
        return (this.element as any)[prop];
    }

    removeit(): void {
        //移除所有已注册的监听器
        if (this._listeners) {
            for (const [type, listenerMap] of this._listeners) {
                for (const wrapped of listenerMap.values()) {
                    this.element.removeEventListener(type, wrapped);
                }
            }
            this._listeners.clear();
        }

        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }

    on<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: ApioxObject, ev: ApioxAnyEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): () => void {
        const wrapEvent = (nativeEvent: Event): ApioxAnyEvent => {
            if (nativeEvent instanceof WheelEvent) {
                return new ApioxWheelEvent(nativeEvent);
            } else if (nativeEvent instanceof MouseEvent) {
                return new ApioxMouseEvent(nativeEvent);
            } else if (nativeEvent instanceof KeyboardEvent) {
                return new ApioxKeyboardEvent(nativeEvent);
            } else {
                return new ApioxEvent(nativeEvent);
            }
        };

        const wrappedListener = (nativeEvent: Event) => {
            const wrappedEvent = wrapEvent(nativeEvent);
            listener.call(this, wrappedEvent);
        };

        this.element.addEventListener(type, wrappedListener, options);

        // 存储映射：类型 -> 原始监听器 -> 包装监听器
        if (!this._listeners.has(type as string)) {
            this._listeners.set(type as string, new Map());
        }
        const typeMap = this._listeners.get(type as string)!;
        typeMap.set(listener, wrappedListener);

        // 返回取消函数
        return () => {
            this.off(type as string, listener, options);
        };
    }

    off(type: string, listener: Function, options?: boolean | AddEventListenerOptions): void {
        const typeMap = this._listeners.get(type);
        if (!typeMap) {return;}

        const wrapped = typeMap.get(listener);
        if (wrapped) {
            this.element.removeEventListener(type, wrapped, options);
            typeMap.delete(listener);
            if (typeMap.size === 0) {
                this._listeners.delete(type);
            }
        }
    }

    static wrap(el: HTMLElement): ApioxObject {
        if (el.id) {
            return new ApioxObject(el.id);
        } else if (el.className) {
            return new ApioxObject(null, el.className);
        }
        // 既没有 id 也没有 class 给元素临时添加一个唯一 id，然后用这个 id 构造
        const tempId = '__apiox_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        el.id = tempId;
        return new ApioxObject(tempId);
    }

    static create(tagName: string, options?: { id?: string; className?: string; text?: string; html?: string }): ApioxObject {
        const element = document.createElement(tagName);
        if (options?.id) {element.id = options.id;}
        if (options?.className) {element.className = options.className;}
        if (options?.text) {element.textContent = options.text;}
        if (options?.html) {element.innerHTML = options.html;}
        return ApioxObject.wrap(element);
    }

    getContext(contextId: '2d', options?: CanvasRenderingContext2DSettings): ApioxCanvasContext | null {
        const canvas = this.element as HTMLCanvasElement;
        const ctx = canvas.getContext(contextId, options);
        if (!ctx) return null;
        return new ApioxCanvasContext(ctx);
    }

    addClass(className: string): void {
        this.element.classList.add(className);
    }
    removeClass(className: string): void {
        this.element.classList.remove(className);
    }
    hasClass(className: string): boolean {
        return this.element.classList.contains(className);
    }
    toggleClass(className: string): boolean {
        return this.element.classList.toggle(className);
    }

    show(display:string='block'): void {
        this.element.style.display = display;
    }
    hide(): void {
        this.element.style.display = 'none';
    }

    getRect(): void {
        this.rect = this.element.getBoundingClientRect();
    }
    getRectWidth(): number {
        return this.rect.width;
    }
    getRectHeight(): number {
        return this.rect.height;
    }
    getRectLeft(): number {
        return this.rect.left;
    }
    getRectTop(): number {
        return this.rect.top;
    }
}

export const apiObjects = {
    docum: document,
    win: window,
};

export const winApi = {
    get inWidth(): number { return window.innerWidth; },
    get inHeight(): number { return window.innerHeight; },
};
