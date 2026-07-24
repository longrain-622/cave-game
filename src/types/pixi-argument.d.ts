// pixi-augment.d.ts
import 'pixi.js';

declare module 'pixi.js' {
    interface ApplicationOptions {
        backgroundAlpha?: number;
        /**
         * @deprecated 从 v6.0.0 开始已弃用，使用 `backgroundAlpha` 替代
         */
        transparent?: boolean;
    };

    interface Application {
        init(options?: Partial<ApplicationOptions>): Promise<void>;
        readonly canvas: HTMLCanvasElement;
    };

    interface Container {
        sortableChildren: boolean;
        zIndex: number;
        eventMode: string;
    };

    interface BaseTexture {
        defaultOptions: IBaseTextureOptions;
    };

    interface Sprite {
        eventMode: string;
    };

    export namespace Assets {
        function init(options: { basePath?: string; manifest?: any }): Promise<void>;
        function load<T = any>(urls: string | string[]): Promise<T>;
    };

    export const ticker: {
        add(fn: (delta: number) => void): void;
        remove(fn: (delta: number) => void): void;
        readonly deltaMS: number;
        readonly elapsedMS: number;
        readonly FPS: number;
        start(): void;
        stop(): void;
    };

    export class Ticker {
        static shared: typeof ticker;
        static system: typeof ticker;
        add(fn: (delta: number) => void): void;
        remove(fn: (delta: number) => void): void;
        readonly deltaMS: number;
        readonly elapsedMS: number;
        readonly FPS: number;
        start(): void;
        stop(): void;
    };

    export const Assets: {
        load<T = any>(assets: string | string[]): Promise<T>;
        add(alias: string, src: string): void;
        add(assets: Array<{ alias: string; src: string }>): void;
    };

    interface FederatedPointerEvent {
        target: PIXI.Graphics;
        global: {x: number; y: number};
        stopPropagation: Function;
    }
}

declare namespace PIXI {
    type FederatedPointerEvent = import('pixi.js').FederatedPointerEvent;
}