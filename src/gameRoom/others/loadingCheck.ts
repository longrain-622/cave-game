// loadingCheck.ts
import { isDrawing } from "../rendering/rendering.js";
import { can_drawPlayer } from "../player.js";
import { can_drawEntity } from "../animals/animalDraw.js";
import { gui_isDrawing } from "../gui/gameGUI/inventory.js";
import { sky_isDrawing } from "../nature/sky.js";
import { item_isDrawing } from "../dropped/items.js";
import { apioxTime } from "../../apiox/time.js";
import { finishLoading } from "./loadingPage.js";

let delayTriggered: boolean = false;
let loadTime: number = 0;
let checkTimer: number;

const checkCondition = () => {
  loadTime++;
  if (
    !delayTriggered &&
    isDrawing &&
    can_drawPlayer &&
    can_drawEntity &&
    gui_isDrawing &&
    sky_isDrawing &&
    item_isDrawing
  ) {
    delayTriggered = true;
    finishLoading();
    apioxTime.clearInt(checkTimer);
    console.log("all assets were loaded.");
  }

  // 超时强制进入（10秒 = 100 * 100ms）
  if (!delayTriggered && loadTime > 100) {
    delayTriggered = true;
    finishLoading();
    apioxTime.clearInt(checkTimer);
    console.warn("long time, force entering game.");
  }
};

checkTimer = apioxTime.setInt(checkCondition, 100);