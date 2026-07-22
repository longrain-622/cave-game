export const apioxTime = {
    /**
     * Timeout Function
     * @param func function that will run
     * @param time time
     * @returns timer ID，can use to clearOut
     */
    setOut(func: (...args: any[]) => void, time: number): number {
        return window.setTimeout(func, time);
    },

    /**
     * 清除延迟任务（clearTimeout）
     * @param timerId 由 setOut 返回的定时器 ID
     */
    clearOut(timerId: number): void {
        clearTimeout(timerId);
    },

    /**
     * @param func function that will run
     * @param interval time
     * @returns timer ID，can use to clearInt
     */
    setInt(func: (...args: any[]) => void, interval: number): number {
        return window.setInterval(func, interval);
    },

    /**
     * clear interval（clearInterval）
     * @param timerId setInt return ID of timer
     */
    clearInt(timerId: number): void {
        clearInterval(timerId);
    },

    /**
     * 异步等待（Promise 风格延时）
     * @param ms 等待毫秒数
     * @returns Promise，在指定时间后 resolve
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 防抖函数
     * @param fn 需要防抖的函数
     * @param delay 延迟时间（毫秒）
     * @param immediate 是否立即执行一次（可选）
     * @returns 防抖后的函数，具有 cancel 方法
     */
    debounce<T extends (...args: any[]) => any>(
        fn: T,
        delay: number,
        immediate: boolean = false
    ): T & { cancel: () => void } {
        let timer: number | null = null;
        let result: any;
        const debounced = function (this: any, ...args: Parameters<T>) {
            if (timer) apioxTime.clearOut(timer);
            if (immediate && !timer) {
                result = fn.apply(this, args);
            }
            timer = apioxTime.setOut(() => {
                if (!immediate) result = fn.apply(this, args);
                timer = null;
            }, delay);
            return result;
        } as T & { cancel: () => void };
        debounced.cancel = () => {
            if (timer) apioxTime.clearOut(timer);
            timer = null;
        };
        return debounced;
    },

    /**
     * @param fn 需要节流的函数
     * @param delay 节流间隔（毫秒）
     * @returns 节流后的函数，具有 cancel 方法
     */
    throttle<T extends (...args: any[]) => any>(
        fn: T,
        delay: number
    ): T & { cancel: () => void } {
        let lastTime = 0;
        let timer: number | null = null;
        const throttled = function (this: any, ...args: Parameters<T>) {
            const now = Date.now();
            if (now - lastTime >= delay) {
                if (timer) apioxTime.clearOut(timer);
                lastTime = now;
                fn.apply(this, args);
            } else if (!timer) {
                timer = apioxTime.setOut(() => {
                    lastTime = Date.now();
                    fn.apply(this, args);
                    timer = null;
                }, delay - (now - lastTime));
            }
        } as T & { cancel: () => void };
        throttled.cancel = () => {
            if (timer) apioxTime.clearOut(timer);
            timer = null;
        };
        return throttled;
    },

    /**
     * requestAnimationFrame 包装
     * @param callback 动画回调函数
     * @returns 请求 ID，可用于 cancelFrame
     */
    requestFrame(callback: FrameRequestCallback): number {
        return requestAnimationFrame(callback);
    },

    /**
     * 取消 requestAnimationFrame
     * @param frameId 由 requestFrame 返回的 ID
     */
    cancelFrame(frameId: number): void {
        cancelAnimationFrame(frameId);
    },
};

interface ApioxDate {
    year: number; month: number; day: number;
    hour: number; minute: number; second: number;
}

export function getDate(): ApioxDate {
    const theDate = new Date();
    return {
        year: theDate.getFullYear(), month: theDate.getMonth(), day: theDate.getDay(),
        hour: theDate.getHours(), minute: theDate.getMinutes(), second: theDate.getSeconds(),
    };
}