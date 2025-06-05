export const getRunningEnv = () => {
    let getBackgroundPage = chrome?.extension?.getBackgroundPage;

    if (getBackgroundPage){
        return getBackgroundPage() === window ? 'BACKGROUND' : 'POPUP';
    }

    return chrome?.runtime?.onMessage ? 'CONTENT' : 'WEB';
};


export const popupWindow = (url, windowName, win, w, h)  => {
    const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2)
    const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2)
    //return win.open(url, windowName, `popup, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
    return win.open(url, windowName, `popup, width=${w}, height=${h}, top=${y}, left=${x}`)
}
