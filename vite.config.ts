import { cpSync, existsSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

// 运行时依赖:游戏链通过运行时字符串路径加载(/js/** 动态导入、importmap、PIXI.Assets / fetch / Audio),
// Vite 构建时不可见,需在 closeBundle 时整体镜像进 dist。
const RUNTIME_DEPS: Array<[string, string]> = [
    ['assets', 'dist/assets'],
    ['js', 'dist/js'],
    ['node_modules/pixi.js/dist/pixi.mjs', 'dist/node_modules/pixi.js/dist/pixi.mjs'],
    ['node_modules/localforage/dist/localforage.js', 'dist/node_modules/localforage/dist/localforage.js'],
];

function copyRuntimeAssets(): Plugin {
    return {
        name: 'copy-runtime-assets',
        closeBundle() {
            for (const [src, dest] of RUNTIME_DEPS) {
                // 运行时依赖缺失会让部署后的游戏 404,必须在构建时直接失败暴露
                if (!existsSync(src)) {
                    throw new Error(`[copy-runtime-assets] 运行时依赖缺失: ${src}。` +
                        '请确认已运行 tsc(js/)且依赖产物文件名未变化(如升级 pixi/localforage 后需核对 importmap 路径)。');
                }
                cpSync(src, dest, { recursive: true });
            }
        },
    };
}

export default defineConfig({
    server: {
        port: 3000,
    },
    resolve: {
        extensions: ['.js', '.ts', '.json'],
    },
    base: './',
    build: {
        rollupOptions: {
            // localforage 通过 importmap 以 UMD 形式加载(副作用设置 window.localforage),
            // 打包会丢失该全局副作用,故保持外部引用,由 dist/node_modules 镜像 + importmap 提供。
            external: ['localforage'],
        },
    },
    plugins: [copyRuntimeAssets()],
});
