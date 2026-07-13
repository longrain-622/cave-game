import { apioxEvent } from "../apiox/event.js";
import { ApioxObject } from "../apiox/dom.js";
import { win } from "../apiox/global.js";

apioxEvent.listenGlobalOnce('DOMContentLoaded', () => {
    const logo = new ApioxObject('logo');
    if (win.session.get('logoShown')) {
        logo.domstyle('display', 'none');
    } else {
        win.session.set('logoShown', 'true');
        logo.addClass('animate');
    }
});