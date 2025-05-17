import {POPUP_WINDOW_HEIGHT, POPUP_WINDOW_WIDTH} from "../../../constants";

export default function (event: MessageEvent) {
    const { payload } = event.data
    const { url } = payload

    console.log('Received request for opening popup window with url' + url)

    const y = window.top.outerHeight / 2 + window.top.screenY - (POPUP_WINDOW_HEIGHT / 2)
    const x = window.top.outerWidth / 2 + window.top.screenX - (POPUP_WINDOW_WIDTH / 2)

    // return win.open(url, windowName, `popup, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
    return window.open(url, undefined, `popup, width=${POPUP_WINDOW_WIDTH}, height=${POPUP_WINDOW_HEIGHT}, top=${y}, left=${x}`)
}
