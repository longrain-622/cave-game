// canvas.ts
export class ApioxCanvasContext {
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    // 基础形状
    fillRect(x: number, y: number, w: number, h: number): void {
        this.ctx.fillRect(x, y, w, h);
    }
    strokeRect(x: number, y: number, w: number, h: number): void {
        this.ctx.strokeRect(x, y, w, h);
    }
    clearRect(x: number, y: number, w: number, h: number): void {
        this.ctx.clearRect(x, y, w, h);
    }

    // 路径
    beginPath(): void { this.ctx.beginPath(); }
    closePath(): void { this.ctx.closePath(); }
    moveTo(x: number, y: number): void { this.ctx.moveTo(x, y); }
    lineTo(x: number, y: number): void { this.ctx.lineTo(x, y); }
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
        this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
    }
    fill(): void { this.ctx.fill(); }
    stroke(): void { this.ctx.stroke(); }

    // 样式
    set fillStyle(style: string | CanvasGradient | CanvasPattern) { this.ctx.fillStyle = style; }
    set strokeStyle(style: string | CanvasGradient | CanvasPattern) { this.ctx.strokeStyle = style; }
    set lineWidth(value: number) { this.ctx.lineWidth = value; }
    set globalAlpha(value: number) { this.ctx.globalAlpha = value; }

    set imageSmoothingEnabled(value: boolean) {
        this.ctx.imageSmoothingEnabled = value;
    }
    get imageSmoothingEnabled(): boolean {
        return this.ctx.imageSmoothingEnabled;
    }

    // 变换
    translate(x: number, y: number): void { this.ctx.translate(x, y); }
    scale(x: number, y: number): void { this.ctx.scale(x, y); }
    rotate(angle: number): void { this.ctx.rotate(angle); }
    save(): void { this.ctx.save(); }
    restore(): void { this.ctx.restore(); }

    // 图像绘制
    drawImage(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, dx: number, dy: number, dw?: number, dh?: number): void;
    drawImage(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(image: any, ...args: any[]): void {
        // 处理重载，直接透传
        (this.ctx.drawImage as any)(image, ...args);
    }

    // 文字
    fillText(text: string, x: number, y: number, maxWidth?: number): void {
        this.ctx.fillText(text, x, y, maxWidth);
    }
    strokeText(text: string, x: number, y: number, maxWidth?: number): void {
        this.ctx.strokeText(text, x, y, maxWidth);
    }
    set font(value: string) { this.ctx.font = value; }
    set textAlign(value: CanvasTextAlign) { this.ctx.textAlign = value; }
    set textBaseline(value: CanvasTextBaseline) { this.ctx.textBaseline = value; }

    // 获取原生上下文的逃生舱（如果必须使用未封装的方法）
    raw(): CanvasRenderingContext2D {
        return this.ctx;
    }
}