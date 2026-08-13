import { defineConfig } from 'vite';

// 标准 Vite 单源构建:
// - src/ 是唯一源码树,Vite 直接打包(不再需要 tsc 产物 js/ 与 dist 镜像)。
// - assets/ 作为 publicDir 原样复制进 dist/assets/,运行时字符串路径(PIXI.Assets / fetch / Audio)
//   均为页面相对或根相对地址,dev 与部署后一致,无需构建期处理。
export default defineConfig({
    server: {
        port: 3000,
    },
    resolve: {
        extensions: ['.js', '.ts', '.json'],
    },
    base: './',
});
