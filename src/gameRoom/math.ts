// 纯几何工具：不依赖 DOM、输入、UI 或渲染。
export function point_coll_rect(
    x: number,
    y: number,
    rectX: number,
    rectY: number,
    width: number,
    height: number
): boolean {
    return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx: number = x1 - x2;
    const dy: number = y1 - y2;
    return Math.hypot(dx, dy);
}
