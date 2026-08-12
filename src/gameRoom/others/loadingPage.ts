import { getLang } from "../../others/i18nLang.js";
import { apioxHttp } from "../../apiox/http.js";
import { ApioxObject } from "../../apiox/dom.js";
import { apioxTime } from "../../apiox/time.js";

let loadText: string = 'Loading';
let loadedText: string = 'Okay';
const loadingTextObj = new ApioxObject('loadingText');
const speakerObj = new ApioxObject('loadingSpeaker');

//加载随机提示
async function loadLoadingTip() {
  try {
    const tips = await apioxHttp.get<any>(`/assets/locales/${getLang()}/loading.json`);
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    speakerObj.domProperty('textContent', randomTip);
  } catch {
    speakerObj.domProperty('textContent', 'Sinuxu made');
  }
}
loadLoadingTip();

//获取国际化文本
apioxHttp.get<any>(`assets/locales/${getLang()}/ui.json`)
  .then(data => {
    loadText = data.loadPage.text;
    loadedText = data.loadPage.ok;
    loadingTextObj.domProperty('textContent', loadText);
  })
  .catch(() => {
    loadingTextObj.domProperty('textContent', loadText);
  });

//动态点动画
let dotCounter: number = 0;
let dotTimer: number;

function updateDots(): void {
  dotCounter = (dotCounter + 1) % 4;
  const dots: string = '.'.repeat(dotCounter);
  loadingTextObj.domProperty('textContent', loadText + dots);
}

dotTimer = apioxTime.setInt(updateDots, 100);

// 导出完成加载的方法，供 loadingCheck 调用
export function finishLoading(): void {
  if (dotTimer !== undefined) {apioxTime.clearInt(dotTimer);}
  loadingTextObj.domProperty('textContent', loadedText);
  apioxTime.setOut(() => {
    const pageObj = new ApioxObject(null, 'loadingPage');
    pageObj.hide();
  }, 100);
}