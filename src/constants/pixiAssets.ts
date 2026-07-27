import * as PIXI from 'pixi.js';
import { winObj } from '../apiox/global.js';

const INIT_KEY = '__PIXI_ASSETS_INIT__';

/**
 * 全局唯一初始化 PIXI.Assets。
 * 使用 window 级标志，确保跨模块入口只初始化一次。
 */
export async function ensureAssetsInit(): Promise<void> {
    if ((winObj as any)[INIT_KEY]) {return;}
    (winObj as any)[INIT_KEY] = true;
    await PIXI.Assets.init({ basePath: './assets/' });
}
