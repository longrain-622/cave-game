import { player } from "../../player.js";
import { ctx_gui, gui_isDrawing, img_gui, widgets } from "./inventory.js";

const heart = {
    lasthp: 20,
    timer: 0,
    drawWhite: false,
    drawWhite_phaser: 1
}

function heartsAct(): void {
    // 检测血量是否变化
    if (player.hp !== heart.lasthp) {
        heart.drawWhite = true; // 变化时触发白色效果
        heart.lasthp = player.hp; // 更新记录的值
        heart.drawWhite_phaser = 2;
    }

    if(heart.drawWhite) {
        heart.timer++;
        if(heart.timer >= 6) {
            heart.drawWhite_phaser++;
            heart.timer = 0;
        }
        if(heart.drawWhite_phaser > 4) {
            heart.drawWhite = false;
            heart.drawWhite_phaser = 1;
            heart.timer = 0;
        }
    }
}

function drawHeart(): void { //绘制生命条
    if(!gui_isDrawing) {return;}

    let draw_x = widgets.x;
    let draw_y = widgets.y - 40;

    for(let i = 1; i <= 10; i++) {
        if(heart.drawWhite_phaser % 2 === 0) {
            ctx_gui.drawImage(img_gui.icons, 25, 0, 9, 9, draw_x, draw_y, 32, 32);
        }
        else {
            ctx_gui.drawImage(img_gui.icons, 16, 0, 9, 9, draw_x, draw_y, 32, 32);
        }

        if(player.hp >= 2*i) {
            ctx_gui.drawImage(img_gui.icons, 52, 0, 9, 9, draw_x, draw_y, 32, 32);
        }
        else if(player.hp === 2*i - 1) {
            ctx_gui.drawImage(img_gui.icons, 61, 0, 9, 9, draw_x, draw_y, 32, 32);
        }
        draw_x += 28;
    }
}

export { drawHeart, heartsAct };



