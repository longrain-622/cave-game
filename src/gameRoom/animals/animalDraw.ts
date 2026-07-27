import { player } from '../player.js';
import { isOnScreen } from '../const.js';
import { room } from '../../constants/generic.js';
import { animalArray, Animal } from './animals.js';

// 加载canvas和ctx
const canvas_entity = document.getElementById('drawEntity') as HTMLCanvasElement;
$('#drawEntity').css({
    'width': room.width + 'px',
    'height': room.height + 'px',
    'position': 'absolute',
    'left': '0',
    'top': '0'
});
canvas_entity.width = room.width;
canvas_entity.height = room.height;

const ctx_entity = canvas_entity.getContext('2d');
ctx_entity.imageSmoothingEnabled = false;
const img = {
    pig: new Image(),
    cow: new Image(),
    chicken: new Image(),
    sheep: new Image(),
    sheep_fur: new Image(),
};
img.pig.src = 'assets/images/games/entity/pig.png';
img.cow.src = 'assets/images/games/entity/cow.png';
img.chicken.src = 'assets/images/games/entity/chicken.png';
img.sheep.src = 'assets/images/games/entity/sheep.png';
img.sheep_fur.src = 'assets/images/games/entity/sheep_fur.png';
const images_entity = [img.pig, img.cow, img.chicken, img.sheep, img.sheep_fur];
let imagesLoaded: number = 0;
export let can_drawEntity: boolean = false;
// 新增：存储红色版图片
const redImg = {
    pig: null as HTMLImageElement | null,
    cow: null as HTMLImageElement | null,
    chicken: null as HTMLImageElement | null,
    sheep: null as HTMLImageElement | null,
    sheep_fur: null as HTMLImageElement | null,
};
// 生成红色色调图片的函数
function makeRedImage(srcImg: HTMLImageElement): HTMLImageElement {
    // 创建离屏 canvas
    const canvas = document.createElement('canvas');
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(srcImg, 0, 0);
    // 获取像素数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // 保留原亮度，但将色相转向红色：增强R通道，降低G/B
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        // 简单的红色混合：保持亮度，主要增加红色分量
        let brightness = (r + g + b) / 3;
        data[i] = Math.min(255, brightness + 80);     // R 提高
        data[i+1] = brightness * 0.5;                // G 减半
        data[i+2] = brightness * 0.3;                // B 更少
        // 透明通道不变
    }
    ctx.putImageData(imageData, 0, 0);
    const redImgElement = new Image();
    redImgElement.src = canvas.toDataURL();
    return redImgElement;
}
// 等所有原图加载完成后，生成红色版本
function generateRedImages() {
    redImg.pig = makeRedImage(img.pig);
    redImg.cow = makeRedImage(img.cow);
    redImg.chicken = makeRedImage(img.chicken);
    redImg.sheep = makeRedImage(img.sheep);
    redImg.sheep_fur = makeRedImage(img.sheep_fur);
}
// 修改图片加载完成回调
function checkAllLoaded() {
    imagesLoaded++;
    if (imagesLoaded === images_entity.length) {
        generateRedImages();   // 原图加载完再生成红色版
        can_drawEntity = true;
    }
}

images_entity.forEach(img => img.addEventListener('load', checkAllLoaded));

function drawAnimals(): void {
    for (let i = 0; i < animalArray.length; i++) {
        const animal: Animal = animalArray[i];
        let draw_x = player.screen_x + animal.x - player.x;
        let draw_y = player.screen_y + animal.y - player.y;

        if(!isOnScreen(draw_x, draw_y, animal.width, animal.height)) {continue;}

        const needFlip: boolean = (animal.dir === 1);
        const needDierad: boolean = (animal.hp <= 0);
        const isFlashing: boolean = (animal.flashFrames > 0 || animal.isDying);

        // 统一保存状态，应用所有变换
        ctx_entity.save();

        // 水平翻转
        if (needFlip) {
            ctx_entity.translate(draw_x + animal.width / 2, draw_y);
            ctx_entity.scale(-1, 1);
            ctx_entity.translate(-(draw_x + animal.width / 2), -draw_y);
        }

        // 死亡旋转
        if (needDierad) {
            ctx_entity.translate(draw_x + animal.width / 2, draw_y + animal.height / 2);
            ctx_entity.rotate(animal.dierad);
            ctx_entity.translate(-(draw_x + animal.width / 2), -(draw_y + animal.height / 2));
        }

        // 根据闪红状态选择图片集
        const pigImg = isFlashing ? redImg.pig : img.pig;
        const cowImg = isFlashing ? redImg.cow : img.cow;
        const chickenImg = isFlashing ? redImg.chicken : img.chicken;
        const sheepImg = isFlashing ? redImg.sheep : img.sheep;
        const sheepFurImg = isFlashing ? redImg.sheep_fur : img.sheep_fur;

        // 绘制动物（原有绘制代码保持不变）
        switch (animal.type) {
            case 0: // 猪
                ctx_entity.drawImage(pigImg, 8, 8, 8, 8, draw_x - 8, draw_y - 8, 40, 40);
                ctx_entity.drawImage(pigImg, 17, 17, 4, 3, draw_x + 2, draw_y + 12, 20, 15);

                ctx_entity.save();
                ctx_entity.translate(draw_x + 36, draw_y + 32);
                ctx_entity.rotate(Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(pigImg, 4, 20, 4, 6, -4, 0, 16, 24);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 84, draw_y + 32);
                ctx_entity.rotate(-Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(pigImg, 4, 20, 4, 6, -4, 0, 16, 24);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 32, draw_y + 32);
                ctx_entity.rotate(-Math.PI / 2);
                ctx_entity.drawImage(pigImg, 52, 16, 8, 16, 0, 0, 32, 64);
                ctx_entity.restore();
                break;

            case 1: // 牛
                ctx_entity.drawImage(cowImg, 6, 6, 8, 8, draw_x - 8, draw_y - 8, 40, 40);

                ctx_entity.save();
                ctx_entity.translate(draw_x + 36, draw_y + 32);
                ctx_entity.rotate(Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(cowImg, 0, 20, 4, 11, -4, 0, 16, 44);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 88, draw_y + 32);
                ctx_entity.rotate(-Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(cowImg, 4, 20, 4, 11, -4, 0, 16, 44);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 32, draw_y + 36);
                ctx_entity.rotate(-Math.PI / 2);
                ctx_entity.drawImage(cowImg, 17, 14, 10, 17, 0, 0, 40, 68);
                ctx_entity.restore();
                break;

            case 2: // 羊
                ctx_entity.drawImage(sheepImg, 8, 8, 6, 6, draw_x - 8, draw_y - 8, 40, 40);

                ctx_entity.save();
                ctx_entity.translate(draw_x + 36, draw_y + 28);
                ctx_entity.rotate(Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(sheepImg, 0, 19, 4, 12, -4, 0, 16, 48);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 84, draw_y + 28);
                ctx_entity.rotate(-Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(sheepImg, 0, 19, 4, 12, -4, 0, 16, 48);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 32, draw_y + 32);
                ctx_entity.rotate(-Math.PI / 2);
                ctx_entity.drawImage(sheepFurImg, 36, 14, 6, 16, 0, 0, 32, 64);
                ctx_entity.restore();
                break;

            case 3: // 鸡
                ctx_entity.drawImage(chickenImg, 3, 3, 4, 6, draw_x + 32, draw_y, 16, 24);
                ctx_entity.drawImage(chickenImg, 5, 15, 8, 8, draw_x + 24, draw_y + 24, 32, 32);

                ctx_entity.save();
                ctx_entity.translate(draw_x + 24, draw_y + 56);
                ctx_entity.rotate(Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(chickenImg, 36, 3, 1, 6, 0, 0, 4, 24);
                ctx_entity.restore();

                ctx_entity.save();
                ctx_entity.translate(draw_x + 52, draw_y + 56);
                ctx_entity.rotate(-Math.sin(animal.legrad) / 2);
                ctx_entity.drawImage(chickenImg, 36, 3, 1, 6, 0, 0, 4, 24);
                ctx_entity.restore();

                ctx_entity.drawImage(chickenImg, 30, 13, 2, 6, draw_x + 16, draw_y + 28, 8, 24);
                ctx_entity.drawImage(chickenImg, 30, 13, 2, 6, draw_x + 56, draw_y + 28, 8, 24);
                ctx_entity.drawImage(chickenImg, 16, 0, 4, 2, draw_x + 32, draw_y + 8, 16, 8);
                break;
        }

        // 恢复变换（一次性撤销翻转和旋转）
        ctx_entity.restore();
    }
}

export { drawAnimals, ctx_entity, canvas_entity };

