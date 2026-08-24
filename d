warning: in the working copy of 'src/gameRoom/animals/instance/generic.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'src/gameRoom/gui/gameGUI/blockGUI/furnace.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'src/gameRoom/rendering/light.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'src/types/worldArchive.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'src/user/saveWorld.ts', CRLF will be replaced by LF the next time Git touches it
[1mdiff --git a/src/gameRoom/animals/instance/generic.ts b/src/gameRoom/animals/instance/generic.ts[m
[1mindex ca2967d..14e020d 100644[m
[1m--- a/src/gameRoom/animals/instance/generic.ts[m
[1m+++ b/src/gameRoom/animals/instance/generic.ts[m
[36m@@ -1,5 +1,5 @@[m
 import { player } from "../../player.js";[m
[31m-import { BlockPos, world, place_meeting } from "../../world.js";[m
[32m+[m[32mimport { BlockPos, world, place_meeting, blockTypeAt } from "../../world.js";[m
 import { point_coll_rect } from "../../const.js";[m
 import { idOfBlock, canOver } from "../../nature/blockMecha/blocks.js";[m
 import { getRandomInt } from "../../../constants/utils.js";[m
[36m@@ -14,7 +14,7 @@[m [mimport { apioxEvent } from "../../../apiox/event.js";[m
 [m
 export function initAnimalY(animal: Animal): void {[m
     let a: number = 0;[m
[31m-    while (world[a][Math.floor(animal.x / 64)] === -1) {[m
[32m+[m[32m    while (blockTypeAt(Math.floor(animal.x / 64), a) === -1) {[m
         a++;[m
     }[m
     animal.y = a * 64 - 256;[m
[36m@@ -52,7 +52,7 @@[m [mfunction isWalkable(row: number, col: number): boolean {[m
     if (row <= idOfBlock.air || row >= world.length) {return false;}[m
     const rowData: number[] | undefined = world[row];[m
     if (col <= idOfBlock.air || col >= rowData.length) {return false;}[m
[31m-    return canOver(rowData[col]);[m
[32m+[m[32m    return canOver(blockTypeAt(col, row));[m
 }[m
 [m
 // 寻找玩家[m
[1mdiff --git a/src/gameRoom/dropped/items.ts b/src/gameRoom/dropped/items.ts[m
[1mindex 7b2286d..e1a6cd4 100644[m
[1m--- a/src/gameRoom/dropped/items.ts[m
[1m+++ b/src/gameRoom/dropped/items.ts[m
[36m@@ -3,7 +3,7 @@[m [mimport { idOfItem, itemTextures, item_isDrawing } from './itemIds.js';[m
 export { idOfItem, itemTextures, item_isDrawing };[m
 import { Slots } from "../gui/gameGUI/inventoryConfig.js";[m
 import { idOfBlock } from "../nature/blockMecha/blocks.js";[m
[31m-import { isOutOfBounds, setWorldState, world, newBlockState } from "../world.js";[m
[32m+[m[32mimport { isOutOfBounds, setWorldState, newBlockState, blockTypeAt } from "../world.js";[m
 import { mouse } from "../mouse.js";[m
 import { createDrop } from "./droppedItem.js";[m
 [m
[36m@@ -26,7 +26,7 @@[m [mfunction putDoor(doorId: number): void {[m
         case idOfItem.oak_door: doorBlockId_b = idOfBlock.oak_door_bottom; doorBlockId_t = idOfBlock.oak_door_top; break;[m
     }[m
 [m
[31m-    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x) && world[mouse.world_y - 1][mouse.world_x] === idOfBlock.air) {[m
[32m+[m[32m    if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x) && blockTypeAt(mouse.world_x, mouse.world_y - 1) === idOfBlock.air) {[m
         setWorldState({ x: mouse.world_x, y: mouse.world_y }, newBlockState(doorBlockId_b));[m
         setWorldState({ x: mouse.world_x, y: mouse.world_y - 1 }, newBlockState(doorBlockId_t));[m
     } else {[m
[1mdiff --git a/src/gameRoom/gui/gameGUI/blockGUI/chest.ts b/src/gameRoom/gui/gameGUI/blockGUI/chest.ts[m
[1mindex 734780c..c804138 100644[m
[1m--- a/src/gameRoom/gui/gameGUI/blockGUI/chest.ts[m
[1m+++ b/src/gameRoom/gui/gameGUI/blockGUI/chest.ts[m
[36m@@ -3,7 +3,7 @@[m [mimport { handleBackpackClick, handleBackpackContextMenu, setSelectedIndex } from[m
 import { inventory, updateSelectingItem, guiContainer } from '../inventory.js';[m
 import { genericTextStyle, blockTextures } from '../../../rendering/rendering.js';[m
 import { itemTextures } from '../../../dropped/items.js';[m
[31m-import { world } from '../../../world.js';[m
[32m+[m[32mimport { world, blockTypeAt } from '../../../world.js';[m
 import { getRandomInt } from '../../../const.js';[m
 import { room } from '../../../../constants/generic.js';[m
 import { mouse } from '../../../mouse.js';[m
[36m@@ -49,7 +49,7 @@[m [mfunction lookChest(look_x: number, look_y: number): Chest {[m
     // 清除无用的箱子对象[m
     for (let i = chests.length - 1; i >= 0; i--) {[m
         const cst: Chest = chests[i];[m
[31m-        if (!world[cst.world_y] || world[cst.world_y][cst.world_x] !== idOfBlock.chest) {[m
[32m+[m[32m        if (!world[cst.world_y] || blockTypeAt(cst.world_x, cst.world_y) !== idOfBlock.chest) {[m
             chests.splice(i, 1);[m
         }[m
     }[m
[36m@@ -74,7 +74,7 @@[m [mfunction setCurrentChest(wx: number, wy: number): void {[m
 // 打开箱子[m
 apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {[m
     if (ev.button !== 2) {return;}[m
[31m-    if (world[mouse.world_y][mouse.world_x] === idOfBlock.chest) {[m
[32m+[m[32m    if (blockTypeAt(mouse.world_x, mouse.world_y) === idOfBlock.chest) {[m
         if (uistate.anyui_isOpening_except(uistate.chest_isOpening)) {return;}[m
         if (!uistate.chest_isOpening) {[m
             setCurrentChest(mouse.world_x, mouse.world_y);[m
[36m@@ -469,7 +469,7 @@[m [mexport function handleChestBackpackContextMenu(): void {[m
 [m
 //箱子被破坏时的处理[m
 export function breakChest(chest_world_x: number, chest_world_y: number): void {[m
[31m-    if (world[chest_world_y][chest_world_x] === idOfBlock.chest && chests.length > 0) {[m
[32m+[m[32m    if (blockTypeAt(chest_world_x, chest_world_y) === idOfBlock.chest && chests.length > 0) {[m
         //破坏箱子后关闭 GUI 状态[m
         if (uistate.chest_isOpening) {[m
             uistate.chest_isOpening = false;[m
[1mdiff --git a/src/gameRoom/gui/gameGUI/blockGUI/crafting_table.ts b/src/gameRoom/gui/gameGUI/blockGUI/crafting_table.ts[m
[1mindex 3810207..b0fb1e7 100644[m
[1m--- a/src/gameRoom/gui/gameGUI/blockGUI/crafting_table.ts[m
[1m+++ b/src/gameRoom/gui/gameGUI/blockGUI/crafting_table.ts[m
[36m@@ -4,7 +4,7 @@[m [mimport { updateSelectingItem, inventory } from "../inventory.js";[m
 import { updateResultForGrid, consumeFromGrid } from './crafting.js';[m
 import { recipes } from "./craftingRecipe.js";[m
 import { mouse } from "../../../mouse.js";[m
[31m-import { world } from "../../../world.js";[m
[32m+[m[32mimport { blockTypeAt } from "../../../world.js";[m
 import { room } from "../../../../constants/generic.js";[m
 import { blockTextures, genericTextStyle } from "../../../rendering/rendering.js";[m
 import { itemTextures } from "../../../dropped/items.js";[m
[36m@@ -35,7 +35,7 @@[m [mfor (let i = 0; i < WORKBENCH_COLS * WORKBENCH_ROWS; i++) {[m
 [m
 apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {[m
     if (ev.button !== 2) {return;}[m
[31m-    if (world[mouse.world_y][mouse.world_x] === idOfBlock.crafting_table) {[m
[32m+[m[32m    if (blockTypeAt(mouse.world_x, mouse.world_y) === idOfBlock.crafting_table) {[m
         if (uistate.anyui_isOpening_except(uistate.craftingTable_isOpening)) {return;}[m
         if (!uistate.craftingTable_isOpening) {[m
             uistate.craftingTable_isOpening = true;[m
[1mdiff --git a/src/gameRoom/gui/gameGUI/blockGUI/furnace.ts b/src/gameRoom/gui/gameGUI/blockGUI/furnace.ts[m
[1mindex ed2c0bb..5267688 100644[m
[1m--- a/src/gameRoom/gui/gameGUI/blockGUI/furnace.ts[m
[1m+++ b/src/gameRoom/gui/gameGUI/blockGUI/furnace.ts[m
[36m@@ -4,7 +4,7 @@[m [mimport { guiContainer, inventory, updateSelectingItem } from '../inventory.js';[m
 import { room } from '../../../../constants/generic.js';[m
 import { genericTextStyle, blockTextures } from '../../../rendering/rendering.js';[m
 import { itemTextures } from '../../../dropped/items.js';[m
[31m-import { world } from '../../../world.js';[m
[32m+[m[32mimport { world, blockTypeAt } from '../../../world.js';[m
 import { getRandomInt, point_coll_rect } from '../../../const.js';[m
 import { readingWorld, coverWhenSave } from '../../../gameState.js';[m
 import { WorldArchive, FurnaceArchive } from '../../../../types/worldArchive.js';[m
[36m@@ -61,7 +61,7 @@[m [mfunction lookFurnace(look_x: number, look_y: number): Furnace {[m
     // 清除无用的熔炉对象[m
     for (let i = furnaceArray.length - 1; i >= 0; i--) {[m
         const fur: Furnace = furnaceArray[i];[m
[31m-        if (!world[fur.world_y] || world[fur.world_y][fur.world_x] !== idOfBlock.furnace) {[m
[32m+[m[32m        if (!world[fur.world_y] || blockTypeAt(fur.world_x, fur.world_y) !== idOfBlock.furnace) {[m
             furnaceArray.splice(i, 1);[m
         }[m
     }[m
[36m@@ -90,7 +90,7 @@[m [mfunction setCurrentFurnace(wx: number, wy: number): void {[m
 // 打开熔炉[m
 apioxEvent.onMouseDown((ev: ApioxMouseEvent) => {[m
     if (ev.button !== 2) {return;}[m
[31m-    if (world[mouse.world_y][mouse.world_x] === idOfBlock.furnace) {[m
[32m+[m[32m    if (blockTypeAt(mouse.world_x, mouse.world_y) === idOfBlock.furnace) {[m
         if (uistate.anyui_isOpening_except(uistate.furnace_isOpening)) {return;}[m
         if (!uistate.furnace_isOpening) {[m
             setCurrentFurnace(mouse.world_x, mouse.world_y);[m
[36m@@ -720,7 +720,7 @@[m [mexport function furnaceLoop(): void {[m
 [m
 // 熔炉被破坏时的处理[m
 export function breakFurnace(furnace_world_x: number, furnace_world_y: number): void {[m
[31m-    if (world[furnace_world_y][furnace_world_x] === idOfBlock.furnace && furnaceArray.length > 0) {[m
[32m+[m[32m    if (blockTypeAt(furnace_world_x, furnace_world_y) === idOfBlock.furnace && furnaceArray.length > 0) {[m
         // 破坏熔炉后关闭 GUI 状态[m
         if (uistate.furnace_isOpening) {[m
             uistate.furnace_isOpening = false;[m
[1mdiff --git a/src/gameRoom/mouse.ts b/src/gameRoom/mouse.ts[m
[1mindex 5dbb63a..3a79cb0 100644[m
[1m--- a/src/gameRoom/mouse.ts[m
[1m+++ b/src/gameRoom/mouse.ts[m
[36m@@ -1,5 +1,5 @@[m
 import { player } from './player.js';[m
[31m-import { world, setWorldState, isOutOfBounds, isBlockFold, newBlockState } from './world.js';[m
[32m+[m[32mimport { setWorldState, isOutOfBounds, isBlockFold, newBlockState, blockTypeAt } from './world.js';[m
 import { distance, getRandomInt } from './const.js';[m
 import { room } from '../constants/generic.js';[m
 import { inventory, widgets } from './gui/gameGUI/inventory.js';[m
[36m@@ -135,11 +135,11 @@[m [mexport function mouseAct(): void {[m
     // 不能在 mousemove 里计算[m
     if (!isOutOfBounds(mouse.world_y - 1, mouse.world_x - 1) && !isOutOfBounds(mouse.world_y + 1, mouse.world_x + 1)) {[m
         mouse.can_put = (mouse.can_use && ([m
[31m-            world[mouse.world_y][mouse.world_x - 1] !== idOfBlock.air ||[m
[31m-            world[mouse.world_y][mouse.world_x + 1] !== idOfBlock.air ||[m
[31m-            world[mouse.world_y - 1][mouse.world_x] !== idOfBlock.air ||[m
[31m-            world[mouse.world_y + 1][mouse.world_x] !== idOfBlock.air[m
[31m-        ) && world[mouse.world_y][mouse.world_x] <= idOfBlock.air[m
[32m+[m[32m            blockTypeAt(mouse.world_x - 1, mouse.world_y) !== idOfBlock.air ||[m
[32m+[m[32m            blockTypeAt(mouse.world_x + 1, mouse.world_y) !== idOfBlock.air ||[m
[32m+[m[32m            blockTypeAt(mouse.world_x, mouse.world_y - 1) !== idOfBlock.air ||[m
[32m+[m[32m            blockTypeAt(mouse.world_x, mouse.world_y + 1) !== idOfBlock.air[m
[32m+[m[32m        ) && blockTypeAt(mouse.world_x, mouse.world_y) <= idOfBlock.air[m
         && !isBlockFold({ x: mouse.world_x, y: mouse.world_y }));[m
     } else {[m
         mouse.can_put = false;[m
[36m@@ -148,23 +148,23 @@[m [mexport function mouseAct(): void {[m
     //鼠标挖方块计时器[m
     if (mouse.isDown &&[m
         mouse.downingButton === 0 &&[m
[31m-        world[mouse.world_y][mouse.world_x] !== idOfBlock.air &&[m
[32m+[m[32m        blockTypeAt(mouse.world_x, mouse.world_y) !== idOfBlock.air &&[m
         !isBlockFold({ x: mouse.world_x, y: mouse.world_y })[m
     ) {[m
         // 检查目标方块是否改变[m
         if (mouse.last_world_x !== mouse.world_x || mouse.last_world_y !== mouse.world_y[m
             || mouse.last_tool !== inventory.items[widgets.select].item[m
[31m-            || mouse.last_targetBlock !== world[mouse.world_y][mouse.world_x][m
[32m+[m[32m            || mouse.last_targetBlock !== blockTypeAt(mouse.world_x, mouse.world_y)[m
         ) {[m
             mouse.timer = 0;[m
             mouse.destory = 0;[m
             mouse.last_world_x = mouse.world_x;[m
             mouse.last_world_y = mouse.world_y;[m
             mouse.last_tool = inventory.items[widgets.select].item;[m
[31m-            mouse.last_targetBlock = world[mouse.world_y][mouse.world_x];[m
[32m+[m[32m            mouse.last_targetBlock = blockTypeAt(mouse.world_x, mouse.world_y);[m
 [m
             // 更新硬度[m
[31m-            const blockId = world[mouse.world_y][mouse.world_x];[m
[32m+[m[32m            const blockId = blockTypeAt(mouse.world_x, mouse.world_y);[m
             mouse.blockhardness = calculateHardness(blockId);[m
         }[m
 [m
[36m@@ -185,24 +185,24 @@[m [mexport function mouseAct(): void {[m
         && player.hp > 0[m
         && mouse.isDown[m
         && mouse.downingButton === 0[m
[31m-        && world[mouse.world_y][mouse.world_x] !== -1[m
[32m+[m[32m        && blockTypeAt(mouse.world_x, mouse.world_y) !== -1[m
         && mouse.blockhardness !== -1[m
     ) { // 挖掘[m
         if (!player.needRotateHand) {player.needRotateHand = true;}[m
[31m-        if (getRandomInt(0, 16) === 1) {createParticles(world[mouse.world_y][mouse.world_x], mouse.world_x * 64 - 8 + getRandomInt(0, 1) * 72, mouse.world_y * 64 - 8 + getRandomInt(0, 1) * 72);}[m
[32m+[m[32m        if (getRandomInt(0, 16) === 1) {createParticles(blockTypeAt(mouse.world_x, mouse.world_y), mouse.world_x * 64 - 8 + getRandomInt(0, 1) * 72, mouse.world_y * 64 - 8 + getRandomInt(0, 1) * 72);}[m
 [m
         if (mouse.destory > 9) {[m
             // 挖掘和掉落[m
             mouse.destory = 0;[m
             mouse.timer = 0;[m
             const mine_mousey: number = mouse.world_y, mine_mousex: number = mouse.world_x;[m
[31m-            let targetBlock: number = world[mine_mousey][mine_mousex];[m
[32m+[m[32m            let targetBlock: number = blockTypeAt(mine_mousex, mine_mousey);[m
             let dropBlock: number = lookDrops(targetBlock); // 决定掉落物类型[m
             eventBus.emit('block:break', targetBlock);[m
 [m
             // 管理粒子生成[m
             for (let a = 0; a < getRandomInt(16, 32); a++) {[m
[31m-                createParticles(world[mine_mousey][mine_mousex], mine_mousex * 64 + getRandomInt(0, 64), mine_mousey * 64 + getRandomInt(0, 64));[m
[32m+[m[32m                createParticles(blockTypeAt(mine_mousex, mine_mousey), mine_mousex * 64 + getRandomInt(0, 64), mine_mousey * 64 + getRandomInt(0, 64));[m
             }[m
 [m
             createDrop(dropBlock, mine_mousex * 64, mine_mousey * 64); // 生成掉落物[m
[1mdiff --git a/src/gameRoom/nature/blockMecha/blockMechanism.ts b/src/gameRoom/nature/blockMecha/blockMechanism.ts[m
[1mindex 8174786..f5b6e41 100644[m
[1m--- a/src/gameRoom/nature/blockMecha/blockMechanism.ts[m
[1m+++ b/src/gameRoom/nature/blockMecha/blockMechanism.ts[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { world, isOutOfBounds, setWorldState, changePos, BlockPos, newBlockState } from '../../world.js';[m
[32m+[m[32mimport { isOutOfBounds, setWorldState, changePos, BlockPos, newBlockState, blockTypeAt } from '../../world.js';[m
 import {[m
     sand_gravity,[m
     cactus_and_deadBush,[m
[36m@@ -21,7 +21,7 @@[m [mfunction lookBlocks(): void { // 检测方块并触发方块的机制[m
     for (const pos of positions) {[m
         if (isOutOfBounds(pos.y, pos.x)) {continue;}[m
         const { x, y } = pos;[m
[31m-        let looking_block = world[y][x];[m
[32m+[m[32m        let looking_block = blockTypeAt(x, y);[m
 [m
         looking_block = grass_and_dirt(looking_block, x, y);[m
         looking_block = sand_gravity(looking_block, x, y);[m
[36m@@ -31,7 +31,7 @@[m [mfunction lookBlocks(): void { // 检测方块并触发方块的机制[m
         looking_block = snowGrass(looking_block, x, y);[m
 [m
         // 只有方块发生变化才写入，否则会反复加入待处理列表导致死循环[m
[31m-        if (looking_block !== world[y][x]) {[m
[32m+[m[32m        if (looking_block !== blockTypeAt(x, y)) {[m
             setWorldState({ x, y }, newBlockState(looking_block));[m
         }[m
     }[m
[1mdiff --git a/src/gameRoom/nature/blockMecha/bmFunction.ts b/src/gameRoom/nature/blockMecha/bmFunction.ts[m
[1mindex 60ca8b2..70d82d7 100644[m
[1m--- a/src/gameRoom/nature/blockMecha/bmFunction.ts[m
[1m+++ b/src/gameRoom/nature/blockMecha/bmFunction.ts[m
[36m@@ -1,5 +1,5 @@[m
 import { entityBlock_array, newEntityBlock } from "../entityBlock.js";[m
[31m-import { world, isOutOfBounds, setWorldState, BlockPos, newBlockState } from "../../world.js";[m
[32m+[m[32mimport { isOutOfBounds, setWorldState, BlockPos, newBlockState, blockTypeAt } from "../../world.js";[m
 import { getRandomInt } from "../../../constants/utils.js";[m
 import { createParticles } from "../../particle.js";[m
 import { createDrop } from "../../dropped/droppedItem.js";[m
[36m@@ -18,21 +18,21 @@[m [mconst GRASS_DELAY_FRAMES: number = 256;[m
 function shouldChangeGrassDirt(x: number, y: number): boolean {[m
     if (isOutOfBounds(y, x)) {return false;}[m
 [m
[31m-    if (world[y][x] === idOfBlock.grass) { // 草方块的性质：被覆盖时变成泥土[m
[32m+[m[32m    if (blockTypeAt(x, y) === idOfBlock.grass) { // 草方块的性质：被覆盖时变成泥土[m
         if (isOutOfBounds(y - 1, x)) {return false;}[m
[31m-        return !canOver(world[y - 1][x]);[m
[32m+[m[32m        return !canOver(blockTypeAt(x, y - 1));[m
     }[m
 [m
[31m-    if (world[y][x] === idOfBlock.dirt) { // 泥土的性质：旁边是草会长草[m
[32m+[m[32m    if (blockTypeAt(x, y) === idOfBlock.dirt) { // 泥土的性质：旁边是草会长草[m
         if (isOutOfBounds(y - 1, x) || isOutOfBounds(y, x - 1) || isOutOfBounds(y, x + 1) ||[m
             isOutOfBounds(y - 1, x - 1) || isOutOfBounds(y - 1, x + 1) ||[m
             isOutOfBounds(y + 1, x - 1) || isOutOfBounds(y + 1, x + 1)) {[m
             return false;[m
         }[m
[31m-        return (world[y][x - 1] === idOfBlock.grass || world[y][x + 1] === idOfBlock.grass ||[m
[31m-            world[y - 1][x - 1] === idOfBlock.grass || world[y - 1][x + 1] === idOfBlock.grass ||[m
[31m-            world[y + 1][x - 1] === idOfBlock.grass || world[y + 1][x + 1] === idOfBlock.grass)[m
[31m-            && world[y - 1][x] === idOfBlock.air;[m
[32m+[m[32m        return (blockTypeAt(x - 1, y) === idOfBlock.grass || blockTypeAt(x + 1, y) === idOfBlock.grass ||[m
[32m+[m[32m            blockTypeAt(x - 1, y - 1) === idOfBlock.grass || blockTypeAt(x + 1, y - 1) === idOfBlock.grass ||[m
[32m+[m[32m            blockTypeAt(x - 1, y + 1) === idOfBlock.grass || blockTypeAt(x + 1, y + 1) === idOfBlock.grass)[m
[32m+[m[32m            && blockTypeAt(x, y - 1) === idOfBlock.air;[m
     }[m
 [m
     return false;[m
[36m@@ -44,7 +44,7 @@[m [mexport function setGrassDirt(): void { // 每帧调用：草/泥土延迟倒计[m
 [m
         // 方块已不是草/泥土（被挖掉、被替换或世界推移导致坐标失效），取消延迟[m
         if (isOutOfBounds(pos.y, pos.x) ||[m
[31m-            (world[pos.y][pos.x] !== idOfBlock.grass && world[pos.y][pos.x] !== idOfBlock.dirt)) {[m
[32m+[m[32m            (blockTypeAt(pos.x, pos.y) !== idOfBlock.grass && blockTypeAt(pos.x, pos.y) !== idOfBlock.dirt)) {[m
             grassDirtDelay.splice(i, 1);[m
             continue;[m
         }[m
[36m@@ -57,7 +57,7 @@[m [mexport function setGrassDirt(): void { // 每帧调用：草/泥土延迟倒计[m
         grassDirtDelay.splice(i, 1);[m
         // 到期后重新验证条件（延迟期间条件可能已变化）[m
         if (!shouldChangeGrassDirt(pos.x, pos.y)) {continue;}[m
[31m-        setWorldState({ x: pos.x, y: pos.y }, newBlockState(world[pos.y][pos.x] === idOfBlock.grass ? idOfBlock.dirt : idOfBlock.grass));[m
[32m+[m[32m        setWorldState({ x: pos.x, y: pos.y }, newBlockState(blockTypeAt(pos.x, pos.y) === idOfBlock.grass ? idOfBlock.dirt : idOfBlock.grass));[m
     }[m
 }[m
 [m
[36m@@ -79,7 +79,7 @@[m [mexport function grass_and_dirt(looking_block: number, look_x: number, look_y: nu[m
 [m
 export function inviconGrass(looking_block: number, lookx: number, looky: number): number {[m
     if (looking_block === idOfBlock.invicon_grass) {[m
[31m-        if (world[looky + 1][lookx] !== idOfBlock.glass && world[looky + 1][lookx] !== idOfBlock.dirt) {[m
[32m+[m[32m        if (blockTypeAt(lookx, looky + 1) !== idOfBlock.glass && blockTypeAt(lookx, looky + 1) !== idOfBlock.dirt) {[m
             for (let c = 0; c < getRandomInt(16, 32); c++) {[m
                 createParticles(idOfBlock.invicon_grass, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));[m
             }[m
[36m@@ -91,7 +91,7 @@[m [mexport function inviconGrass(looking_block: number, lookx: number, looky: number[m
 }[m
 [m
 export function sand_gravity(looking_block: number, look_x: number, look_y: number): number {[m
[31m-    if (looking_block === idOfBlock.sand && canOver(world[look_y+1][look_x])) {[m
[32m+[m[32m    if (looking_block === idOfBlock.sand && canOver(blockTypeAt(look_x, look_y + 1))) {[m
         entityBlock_array.push(newEntityBlock(idOfBlock.sand, look_x, look_y));[m
         if (look_y > lowest_point) {return idOfBlock.stone_dark;}[m
         else {return idOfBlock.air;}[m
[36m@@ -101,7 +101,7 @@[m [mexport function sand_gravity(looking_block: number, look_x: number, look_y: numb[m
 [m
 export function cactus_and_deadBush(looking_block: number, lookx: number, looky: number): number {[m
     if (looking_block === idOfBlock.cactus) {[m
[31m-        if (world[looky + 1][lookx] !== idOfBlock.cactus && world[looky + 1][lookx] !== idOfBlock.sand) {[m
[32m+[m[32m        if (blockTypeAt(lookx, looky + 1) !== idOfBlock.cactus && blockTypeAt(lookx, looky + 1) !== idOfBlock.sand) {[m
             const createX: number = lookx * 64;[m
             const createY: number = looky * 64;[m
             for (let c = 0; c < getRandomInt(16, 32); c++) {[m
[36m@@ -111,7 +111,7 @@[m [mexport function cactus_and_deadBush(looking_block: number, lookx: number, looky:[m
             return -1;[m
         }[m
     } else if (looking_block === idOfBlock.deadBush) {[m
[31m-        if (world[looky + 1][lookx] === idOfBlock.air) {[m
[32m+[m[32m        if (blockTypeAt(lookx, looky + 1) === idOfBlock.air) {[m
             for (let c = 0; c < getRandomInt(16, 32); c++) {[m
                 createParticles(idOfBlock.deadBush, lookx * 64 + getRandomInt(0, 64), looky * 64 + getRandomInt(0, 64));[m
             }[m
[36m@@ -126,16 +126,16 @@[m [mexport function door(looking_block: number, lookx: number, looky: number): numbe[m
 [m
     switch (looking_block) {[m
         case idOfBlock.oak_door_bottom:[m
[31m-            if (world[looky - 1][lookx] !== idOfBlock.oak_door_top) {return idOfBlock.air;}[m
[32m+[m[32m            if (blockTypeAt(lookx, looky - 1) !== idOfBlock.oak_door_top) {return idOfBlock.air;}[m
             break;[m
         case idOfBlock.oak_door_top:[m
[31m-            if (world[looky + 1][lookx] !== idOfBlock.oak_door_bottom) {return idOfBlock.air;}[m
[32m+[m[32m            if (blockTypeAt(lookx, looky + 1) !== idOfBlock.oak_door_bottom) {return idOfBlock.air;}[m
             break;[m
         case idOfBlock.oak_door_bottom_open:[m
[31m-            if (world[looky - 1][lookx] !== idOfBlock.oak_door_top_open) {return idOfBlock.air;}[m
[32m+[m[32m            if (blockTypeAt(lookx, looky - 1) !== idOfBlock.oak_door_top_open) {return idOfBlock.air;}[m
             break;[m
         case idOfBlock.oak_door_top_open:[m
[31m-            if (world[looky + 1][lookx] !== idOfBlock.oak_door_bottom_open) {return idOfBlock.air;}[m
[32m+[m[32m            if (blockTypeAt(lookx, looky + 1) !== idOfBlock.oak_door_bottom_open) {return idOfBlock.air;}[m
             break;[m
     }[m
 [m
[36m@@ -146,7 +146,7 @@[m [mexport function door_openOrClose(): void { //run it when mouseup[m
     const mouse_x: number = mouse.world_x;[m
     const mouse_y: number = mouse.world_y;[m
 [m
[31m-    switch (world[mouse_y][mouse_x]) {[m
[32m+[m[32m    switch (blockTypeAt(mouse_x, mouse_y)) {[m
         case idOfBlock.oak_door_bottom:[m
             setWorldState({ x: mouse_x, y: mouse_y }, newBlockState(idOfBlock.oak_door_bottom_open));[m
             setWorldState({ x: mouse_x, y: mouse_y - 1 }, newBlockState(idOfBlock.oak_door_top_open));[m
[36m@@ -168,7 +168,7 @@[m [mexport function door_openOrClose(): void { //run it when mouseup[m
 [m
 export function snowGrass(lookingBlock: number, lookx: number, looky: number): number {[m
     if (lookingBlock === idOfBlock.snowGrass) {[m
[31m-        if (world[looky - 1][lookx] !== idOfBlock.air) {[m
[32m+[m[32m        if (blockTypeAt(lookx, looky - 1) !== idOfBlock.air) {[m
             return idOfBlock.dirt;[m
         } else {[m
             return lookingBlock;[m
[1mdiff --git a/src/gameRoom/nature/createWorld.ts b/src/gameRoom/nature/createWorld.ts[m
[1mindex 24a190a..3bf26e4 100644[m
[1m--- a/src/gameRoom/nature/createWorld.ts[m
[1m+++ b/src/gameRoom/nature/createWorld.ts[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { world_height, pushChunkToWorld, chunk, loadWorld, sealevel } from "../world.js";[m
[32m+[m[32mimport { world_height, pushChunkToWorld, chunk, loadWorld, sealevel, loadPalette, resetPalette, migrateWorldToPalette } from "../world.js";[m
 import { getRandomInt } from "../const.js";[m
 import { player } from "../player.js";[m
 import { eventBus } from "../others/eventBus.js";[m
[36m@@ -242,7 +242,7 @@[m [mfunction createChunk(startX: number, behind: boolean) { //startX:当前区块在[m
 [m
             if (y === g) {worldLine.push(surfaceBlock);}[m
             else if (y > g && y <= s) {[m
[31m-                if (temp === 1 && y >= g + getRandomInt(3, 4)) {worldLine.push(7);}[m
[32m+[m[32m                if (temp === 1 && y >= g + getRandomInt(3, 4)) {worldLine.push(idOfBlock.sandstone);}[m
                 else {worldLine.push(dirtBlock);}[m
             } else if (y > s) {worldLine.push(stoneBlock);}[m
             else {worldLine.push(-1);}[m
[36m@@ -260,7 +260,7 @@[m [mfunction createChunk(startX: number, behind: boolean) { //startX:当前区块在[m
         for (let x = 0; x < chunk.width; x++) {[m
             const globalX: number = startX + x;[m
             const block: number = worlding[y][x];[m
[31m-            if (block !== 2) {continue;} //只在石头中挖洞[m
[32m+[m[32m            if (block !== idOfBlock.stone) {continue;} //只在石头中挖洞[m
 [m
             const stoneTop: number = terrain_stone[x];[m
             if (y < stoneTop + 4 || y > world_height - 10) {continue;} //垂直范围[m
[36m@@ -337,8 +337,8 @@[m [mfunction generateTrees(worlding: number[][]): void {[m
         let y: number = 0;[m
         // 找到最上方非空气的方块[m
         while (y < world_height && worlding[y][x] === -1) {y++;}[m
[31m-        if (y < world_height && (worlding[y][x] === 0 || worlding[y][x] === 6)) { // 确保是草[m
[31m-            worlding[y][x] = 1; // 将草换成泥[m
[32m+[m[32m        if (y < world_height && (worlding[y][x] === idOfBlock.grass || worlding[y][x] === idOfBlock.snowGrass)) { // 确保是草[m
[32m+[m[32m            worlding[y][x] = idOfBlock.dirt; // 将草换成泥[m
             for (let k = 0; k < oak_height; k++) {[m
                 y--;[m
                 if (y >= 0) {worlding[y][x] = idOfBlock.oak;} // 橡木[m
[36m@@ -419,12 +419,19 @@[m [mfunction createWorldMain(): void {[m
 [m
     // 读取存档的世界数组[m
     if (!coverWhenSave) {[m
[32m+[m[32m        resetPalette();[m
         for (let i = 0; i < 8; i++) {[m
             createChunk(chunk.start_x, true);[m
         }[m
         player.initXY();[m
     } else {[m
         loadWorld(readingWorld.world);[m
[32m+[m[32m        // 载入存档自带的调色板；旧存档没有该字段时按方块类型 id 迁移为索引[m
[32m+[m[32m        if (notNullUndefined(readingWorld.palette) && readingWorld.palette.length > 0) {[m
[32m+[m[32m            loadPalette(readingWorld.palette);[m
[32m+[m[32m        } else {[m
[32m+[m[32m            migrateWorldToPalette();[m
[32m+[m[32m        }[m
         // 更新区块状态以匹配加载的世界尺寸，防止 createChunkAnyTime 在错误位置生成新区块[m
         chunk.num = readingWorld.world[0].length / chunk.width;[m
         chunk.start_x = chunk.num * chunk.width;[m
[1mdiff --git a/src/gameRoom/player.ts b/src/gameRoom/player.ts[m
[1mindex df0d243..0ec18e4 100644[m
[1m--- a/src/gameRoom/player.ts[m
[1m+++ b/src/gameRoom/player.ts[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { world_height, world, chunk, place_meeting } from './world.js';[m
[32m+[m[32mimport { world_height, world, chunk, place_meeting, blockTypeAt } from './world.js';[m
 import { enableKeyDoubleClickDetection } from './const.js';[m
 import { room } from '../constants/generic.js';[m
 import { uistate } from './gui/uiState.js';[m
[36m@@ -79,7 +79,7 @@[m [mclass Players {[m
         this.x = chunk.num * chunk.width * 64 / 2;[m
 [m
         let i: number = 0;[m
[31m-        while (world[i][Math.floor(this.x / 64)] === -1) {i++;}[m
[32m+[m[32m        while (blockTypeAt(Math.floor(this.x / 64), i) === -1) {i++;}[m
         this.y = i*64 - 256;[m
     }[m
 [m
[1mdiff --git a/src/gameRoom/rendering/light.ts b/src/gameRoom/rendering/light.ts[m
[1mindex 66b0493..bda63e8 100644[m
[1m--- a/src/gameRoom/rendering/light.ts[m
[1m+++ b/src/gameRoom/rendering/light.ts[m
[36m@@ -1,6 +1,6 @@[m
 import { isAlphaBlock } from '../nature/blockMecha/blocks.js';[m
 import { room } from '../../constants/generic.js';[m
[31m-import { world, world_height, lightPos, isOutOfBounds, BlockPos } from '../world.js';[m
[32m+[m[32mimport { world, world_height, lightPos, isOutOfBounds, BlockPos, blockTypeAt } from '../world.js';[m
 import { player } from '../player.js';[m
 import { app } from './rendering.js';[m
 import * as PIXI from 'pixi.js';[m
[36m@@ -33,13 +33,13 @@[m [mfunction ensureLightMap(): void {[m
 // 读空气光照：实心方块一律视为 0（完全遮挡，不参与空气传播）[m
 function readAirLight(lx: number, ly: number): number {[m
     if (isOutOfBounds(ly, lx)) {return 0;}[m
[31m-    if (!isAlphaBlock(world[ly][lx])) {return 0;}[m
[32m+[m[32m    if (!isAlphaBlock(blockTypeAt(lx, ly))) {return 0;}[m
     return lightMap[ly][lx] ?? 0;[m
 }[m
 [m
 function computeColumnHeight(x: number): number {[m
     for (let i = 0; i < world_height; i++) {[m
[31m-        if (!isAlphaBlock(world[i][x])) {return i;}[m
[32m+[m[32m        if (!isAlphaBlock(blockTypeAt(x, i))) {return i;}[m
     }[m
     return -1;[m
 }[m
[36m@@ -93,7 +93,7 @@[m [mfunction propagate(queue: BlockPos[]): void {[m
         const cur: BlockPos = queue[head++];[m
         if (isOutOfBounds(cur.y, cur.x)) {continue;}[m
 [m
[31m-        const newLight: number = isAlphaBlock(world[cur.y][cur.x])[m
[32m+[m[32m        const newLight: number = isAlphaBlock(blockTypeAt(cur.x, cur.y))[m
             ? calcLight(cur.x, cur.y)[m
             : calcDisplayLight(cur.x, cur.y);[m
         if (newLight === lightMap[cur.y][cur.x]) {continue;}[m
[36m@@ -124,7 +124,7 @@[m [mfunction fullComputeLightMap(): void {[m
     const queue: BlockPos[] = [];[m
     for (let y = 0; y < world_height; y++) {[m
         for (let x = 0; x < width; x++) {[m
[31m-            if (isAlphaBlock(world[y][x]) && hasSkyAccess(x, y)) {[m
[32m+[m[32m            if (isAlphaBlock(blockTypeAt(x, y)) && hasSkyAccess(x, y)) {[m
                 lightMap[y][x] = maxLight;[m
                 queue.push({ x: x, y: y + 1 });[m
                 queue.push({ x: x, y: y - 1 });[m
[1mdiff --git a/src/gameRoom/rendering/rendering.ts b/src/gameRoom/rendering/rendering.ts[m
[1mindex ad1a048..6f6af33 100644[m
[1m--- a/src/gameRoom/rendering/rendering.ts[m
[1m+++ b/src/gameRoom/rendering/rendering.ts[m
[36m@@ -1,5 +1,5 @@[m
 //rendering.ts[m
[31m-import { isOutOfBounds, world } from '../world.js';[m
[32m+[m[32mimport { isOutOfBounds, blockTypeAt } from '../world.js';[m
 import { room } from '../../constants/generic.js';[m
 import { player } from '../player.js';[m
 import { initSkyBackground, initSkyContainer } from '../nature/sky.js';[m
[36m@@ -227,7 +227,7 @@[m [mexport function updateWorldPixi(): void {[m
                 continue;[m
             }[m
 [m
[31m-            const blockType: number = world[worldRow][worldCol];[m
[32m+[m[32m            const blockType: number = blockTypeAt(worldCol, worldRow);[m
             const texture: PIXI.Texture = blockTextures[blockType];[m
             if (texture) {[m
                 sprite.texture = texture;[m
[1mdiff --git a/src/gameRoom/world.ts b/src/gameRoom/world.ts[m
[1mindex e48a84e..bdeac11 100644[m
[1m--- a/src/gameRoom/world.ts[m
[1m+++ b/src/gameRoom/world.ts[m
[36m@@ -29,7 +29,7 @@[m [mexport interface BlockPos {[m
     x: number; y: number;[m
 }[m
 [m
[31m-interface BlockState {[m
[32m+[m[32mexport interface BlockState {[m
     type: number;[m
     behind: boolean;[m
     underCave: boolean;[m
[36m@@ -48,8 +48,9 @@[m [mexport const lightPos: BlockPos[] = []; // 需要计算光照的[m
 // 所有修改 world 数组的操作必须使用该函数[m
 export function setWorldState(pos: BlockPos, state: BlockState): void {[m
     if (isOutOfBounds(pos.y, pos.x)) {return;}[m
[31m-    if (world[pos.y][pos.x] === state.type) {return;}[m
[31m-    world[pos.y][pos.x] = state.type;[m
[32m+[m[32m    const idx: number = registerBlockState(state);[m
[32m+[m[32m    if (world[pos.y][pos.x] === idx) {return;}[m
[32m+[m[32m    world[pos.y][pos.x] = idx;[m
 [m
     // 因为世界改变，所以加入待处理的方块[m
     changePos.push(pos);[m
[36m@@ -67,8 +68,10 @@[m [mexport function setWorldState(pos: BlockPos, state: BlockState): void {[m
 [m
 // 检测点与对象的碰撞[m
 export function place_meeting(x: number, y: number): boolean {[m
[31m-    if (canOver(world[Math.floor(y / 64)][Math.floor(x / 64)])) {return false;}[m
[31m-    else {return true;}[m
[32m+[m[32m    const col: number = Math.floor(x / 64);[m
[32m+[m[32m    const row: number = Math.floor(y / 64);[m
[32m+[m[32m    if (isOutOfBounds(row, col)) {return true;} // 越界视为实体（与旧版 canOver(undefined) 一致）[m
[32m+[m[32m    return !canOver(blockTypeAt(col, row));[m
 }[m
 [m
 export function isBlockFold(pos: BlockPos): boolean {[m
[36m@@ -81,13 +84,18 @@[m [mexport function isBlockFold(pos: BlockPos): boolean {[m
         { x: pos.x - 1, y: pos.y },[m
     ];[m
     for (const n of neighbors) {[m
[31m-        if (isOutOfBounds(n.y, n.x) || !canOver(world[n.y][n.x])) {[m
[32m+[m[32m        if (isOutOfBounds(n.y, n.x) || !canOver(blockTypeAt(n.x, n.y))) {[m
             flat++;[m
         }[m
     }[m
     return flat === 4;[m
 }[m
 [m
[32m+[m[32m// 读取 (x, y) 处方块的类型 id（世界格存的是调色板索引，运行时经调色板解析）[m
[32m+[m[32mexport function blockTypeAt(x: number, y: number): number {[m
[32m+[m[32m    return getBlockState(world[y][x]).type;[m
[32m+[m[32m}[m
[32m+[m
 export function isOutOfBounds(row: number, col: number): boolean { // y, x[m
     if (row < 0 || row >= world_height) {return true;}[m
     const rowLen: number = world[row]?.length ?? 0;[m
[36m@@ -96,16 +104,27 @@[m [mexport function isOutOfBounds(row: number, col: number): boolean { // y, x[m
 [m
 export function pushChunkToWorld(chunkArray: number[][], behind: boolean): void {[m
     const expectedLen: number = chunk.num * chunk.width;[m
[32m+[m[32m    // 区块数组暂存方块类型 id，入世界前统一转为调色板索引[m
[32m+[m[32m    const idToIndex: Map<number, number> = new Map();[m
[32m+[m[32m    const toIndex: (id: number) => number = (id: number) => {[m
[32m+[m[32m        let idx: number | undefined = idToIndex.get(id);[m
[32m+[m[32m        if (idx === undefined) {[m
[32m+[m[32m            idx = registerBlockState(newBlockState(id));[m
[32m+[m[32m            idToIndex.set(id, idx);[m
[32m+[m[32m        }[m
[32m+[m[32m        return idx;[m
[32m+[m[32m    };[m
     for (let i = 0; i < world_height; i++) {[m
         // 截断污染：如果该行长度超过预期，说明被越界写入过[m
         if (world[i].length > expectedLen) {[m
             world[i].length = expectedLen;[m
         }[m
 [m
[32m+[m[32m        const row: number[] = chunkArray[i].map(toIndex);[m
         if (behind) {[m
[31m-            world[i].push(...chunkArray[i]);[m
[32m+[m[32m            world[i].push(...row);[m
         } else {[m
[31m-            world[i].unshift(...chunkArray[i]);[m
[32m+[m[32m            world[i].unshift(...row);[m
         }[m
     }[m
 }[m
[36m@@ -164,3 +183,21 @@[m [mexport function resetPalette(): void {[m
     palette.length = 0;[m
     paletteMap.clear();[m
 }[m
[32m+[m
[32m+[m[32m// 旧存档迁移：世界数组里存的还是方块类型 id，逐格注册基础状态并改写为调色板索引[m
[32m+[m[32mexport function migrateWorldToPalette(): void {[m
[32m+[m[32m    const idToIndex: Map<number, number> = new Map();[m
[32m+[m[32m    const toIndex: (id: number) => number = (id: number) => {[m
[32m+[m[32m        let idx: number | undefined = idToIndex.get(id);[m
[32m+[m[32m        if (idx === undefined) {[m
[32m+[m[32m            idx = registerBlockState(newBlockState(id));[m
[32m+[m[32m            idToIndex.set(id, idx);[m
[32m+[m[32m        }[m
[32m+[m[32m        return idx;[m
[32m+[m[32m    };[m
[32m+[m[32m    for (const row of world) {[m
[32m+[m[32m        for (let c = 0; c < row.length; c++) {[m
[32m+[m[32m            row[c] = toIndex(row[c]);[m
[32m+[m[32m        }[m
[32m+[m[32m    }[m
[32m+[m[32m}[m
[1mdiff --git a/src/types/worldArchive.ts b/src/types/worldArchive.ts[m
[1mindex 4bf1664..45464d4 100644[m
[1m--- a/src/types/worldArchive.ts[m
[1m+++ b/src/types/worldArchive.ts[m
[36m@@ -1,4 +1,6 @@[m
 //存储索引中用到的条目元信息[m
[32m+[m[32mimport { BlockState } from "../gameRoom/world.js";[m
[32m+[m
 interface SaveEntry {[m
     key: string;[m
     name: string;[m
[36m@@ -54,6 +56,7 @@[m [minterface WorldArchive {[m
     name: string;[m
     lastTime: string;[m
     world: number[][];[m
[32m+[m[32m    palette?: BlockState[]; // 调色板（世界格存的是其索引）；旧存档没有该字段，读档时按类型 id 迁移[m
     lowest_point: number;[m
     left_number: number; // 左侧已生成的区块数，读档时用于保持噪声坐标与数组坐标对齐[m
     player: PlayerArchive;[m
[1mdiff --git a/src/user/saveWorld.ts b/src/user/saveWorld.ts[m
[1mindex 3de4aea..e93e542 100644[m
[1m--- a/src/user/saveWorld.ts[m
[1m+++ b/src/user/saveWorld.ts[m
[36m@@ -1,6 +1,6 @@[m
 import { version } from "../constants/generic.js";[m
 import { getDate } from "../apiox/time.js";[m
[31m-import { worldName, world, chunk } from "../gameRoom/world.js";[m
[32m+[m[32mimport { worldName, world, chunk, palette } from "../gameRoom/world.js";[m
 import { player } from "../gameRoom/player.js";[m
 import { Animal, animalArray } from "../gameRoom/animals/animalIds.js";[m
 import { inventory } from "../gameRoom/gui/gameGUI/inventory.js";[m
[36m@@ -42,6 +42,7 @@[m [mfunction saveWorld(cover: boolean, existingNames?: Set<string>): WorldArchive {[m
         name: resolvedName,[m
         lastTime: '',[m
         world: world,[m
[32m+[m[32m        palette: palette,[m
         lowest_point: lowest_point,[m
         left_number: chunk.left_number,[m
         player: { hp: 20, x: 256, y: 256 },[m
