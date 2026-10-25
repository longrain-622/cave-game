// loadingCheck.ts
import { isDrawing } from "../rendering/rendering.js";
import { can_drawPlayer } from "../rendering/actors/playerRender.js";
import { can_drawEntity } from "../rendering/actors/animalRender.js";
import { gui_isDrawing } from "../gui/gameGUI/guiTextures.js";
import { sky_isDrawing } from "../rendering/world/skyRender.js";
import { item_isDrawing } from "../rendering/items/itemTextures.js";
import { apioxTime } from "../../apiox/time.js";
import { finishLoading } from "./loadingPage.js";
import { blockFrameLoaded } from "../rendering/blockFrames.js";

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
    item_isDrawing &&
    blockFrameLoaded
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