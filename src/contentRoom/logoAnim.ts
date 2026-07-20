import { apioxEvent } from "../apiox/event.js";
import { apioxTime } from "../apiox/time.js";
import { ApioxObject } from "../apiox/dom.js";
import { win } from "../apiox/global.js";

apioxEvent.listenGlobalOnce('DOMContentLoaded', (): void => {
    const logo = new ApioxObject('logo');
    if(win.session.get('logoShown') === 'true') {
        logo.hide();
    } else {
        logo.show('flex');
        apioxTime.setOut((): void => {
            logo.hide();
            //logo.addClass('animate');
            win.session.set('logoShown', 'true');
        }, 1000);
    }
});