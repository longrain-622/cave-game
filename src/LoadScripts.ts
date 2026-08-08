import { _room_ } from "./contentRoom/content.js";

// LoadScripts.js
export async function loadScripts() {
  const modulePaths = [
    '/js/gameRoom/others/loadingPage.js',
    '/js/gameRoom/const.js',
    '/js/gameRoom/world.js',
    '/js/gameRoom/nature/createWorld.js',
    '/js/gameRoom/others/soundManager.js',
    '/js/gameRoom/game.js',
    '/js/gameRoom/rendering.js',
    '/js/gameRoom/gui/contentGUI/gameContent.js',
    '/js/gameRoom/nature/sky.js',
    '/js/gameRoom/player.js',
    '/js/gameRoom/nature/blockMecha/blockMechanism.js',
    '/js/gameRoom/animals/animals.js',
    '/js/gameRoom/gui/gameGUI/blockGUI/crafting_table.js',
    '/js/gameRoom/nature/offsetElements.js',
    '/js/gameRoom/others/loadingCheck.js',
  ];

  try {
    const modules = [];
    for (const path of modulePaths) {
      const module = await import(path);
      modules.push(module);
      console.log(`was loaded: ${path}`);
    }
    console.log('all module is good', modules);
    //初始化函数这里调用
  } catch (error) {
    console.error('oh shit, fuck Huang Hengzhi', error);
  }
}