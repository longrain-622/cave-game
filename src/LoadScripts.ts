// LoadScripts.js
export async function loadScripts() {
  // 按加载顺序逐个动态导入(字面量 specifier 供 Vite 静态分析并分割为异步 chunk)。
  try {
    const modules = [
      await import('./gameRoom/others/loadingPage.js'),
      await import('./gameRoom/const.js'),
      await import('./gameRoom/world.js'),
      await import('./gameRoom/nature/createWorld.js'),
      await import('./gameRoom/others/soundManager.js'),
      await import('./gameRoom/game.js'),
      await import('./gameRoom/rendering.js'),
      await import('./gameRoom/gui/contentGUI/gameContent.js'),
      await import('./gameRoom/nature/sky.js'),
      await import('./gameRoom/player.js'),
      await import('./gameRoom/nature/blockMecha/blockMechanism.js'),
      await import('./gameRoom/animals/animals.js'),
      await import('./gameRoom/gui/gameGUI/blockGUI/crafting_table.js'),
      await import('./gameRoom/nature/offsetElements.js'),
      await import('./gameRoom/others/loadingCheck.js'),
    ];
    console.log('all module is good', modules);
    // 初始化函数这里调用
  } catch (error) {
    console.error('oh shit, fuck Huang Hengzhi', error);
  }
}
