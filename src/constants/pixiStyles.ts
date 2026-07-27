import * as PIXI from 'pixi.js';

export function textStyle1(fontSize: number=20): PIXI.TextStyle {
    return new PIXI.TextStyle({
        fontFamily: 'Unifont',
        fontSize: fontSize,
        fill: '#ffffff',
        padding: 10,
    });
}

export function textStyle2(fontSize: number=20): PIXI.TextStyle {
    return new PIXI.TextStyle({
        fontFamily: 'Unifont',
        fontSize: fontSize,
        fill: '#ffffff',
        dropShadow: true, //启用阴影
        dropShadowColor: 0x000000,
        dropShadowAlpha: 0.8,
        dropShadowBlur: 0,
        dropShadowDistance: 2,
        dropShadowAngle: Math.PI / 4,
        padding: 10,
    });
}