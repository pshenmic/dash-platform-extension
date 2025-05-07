import {MessageHandler, Messaging} from "../types/Messaging";
import {EVENTS} from "../constants";
import onOpenPopupWindow from "../injected/messaging/handlers/onOpenPopupWindow";

const handlers: MessageHandler[] = [{
    method: EVENTS.OPEN_POPUP_WINDOW,
    handler: onOpenPopupWindow
}]

// init messaging (from webpage to content-script)
const messaging = new Messaging(handlers, 'content-script')

messaging.init()

function injectScript (src) {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(src);
    (document.head || document.documentElement).append(s);
}

injectScript('injected.js')

console.log('content script loaded')
