// eventBus.ts
type EventMap = {
    'player:footstep': [surface: number]; // []为无参数
    'player:hurt': [];
    'player:attack': [];
    'block:break': [blockId: number];
    'block:put': [blockId: number];
    'item:pickup': [];
    'chunk:create': [behind: boolean];
};

type EventName = keyof EventMap;
type EventCallback<K extends EventName> = (...args: EventMap[K]) => void;

class EventBus {
    // 存储所有事件的监听器：Map<事件名, 回调函数数组>
    private listeners: Map<EventName, Set<EventCallback<any>>> = new Map();

    // 订阅事件
    on<K extends EventName>(event: K, callback: EventCallback<K>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const callbacks = this.listeners.get(event)!;
        callbacks.add(callback);

        // 返回一个取消订阅的函数
        return () => {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        };
    }

    // 发布事件（触发所有订阅的回调）
    emit<K extends EventName>(event: K, ...args: EventMap[K]): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`执行事件 ${event} 的回调时出错:`, error);
                }
            });
        }
    }

    // 可选：只订阅一次
    once<K extends EventName>(event: K, callback: EventCallback<K>): void {
        const wrapper = (...args: EventMap[K]) => {
            callback(...args);
            off(); // 执行一次后自动取消订阅
        };
        const off = this.on(event, wrapper as EventCallback<K>);
    }

    // 清除所有监听（用于游戏重启等）
    clear(): void {
        this.listeners.clear();
    }
}

export const eventBus = new EventBus();