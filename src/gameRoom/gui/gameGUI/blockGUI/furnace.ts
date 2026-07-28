import { Slots } from '../inventoryConfig';
import * as PIXI from 'pixi.js';

interface Furnase {
    fuel: Slots;
    input: Slots;
    output: Slots;
    fuelProgress: number; // 燃料燃烧的进度
    outputProgress: number;
}
const furnaceArray: Furnase[] = [];

interface FurnacePixi {
    furnaceTex: PIXI.BaseTexture;
    background: PIXI.Sprite;
    fuelSprite: PIXI.Sprite;
    fuelCount: PIXI.Text;
    inputSprite: PIXI.Sprite;
    inputCount: PIXI.Text;
    outputSprite: PIXI.Sprite;
    outputCount: PIXI.Text;
    highlight: PIXI.Graphics;
    initPixi: () => void;
}