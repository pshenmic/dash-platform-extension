import {base58} from "@scure/base";

export const getRunningEnv = () => {
    let getBackgroundPage = chrome?.extension?.getBackgroundPage;

    if (getBackgroundPage){
        return getBackgroundPage() === window ? 'BACKGROUND' : 'POPUP';
    }

    return chrome?.runtime?.onMessage ? 'CONTENT' : 'WEB';
};

export const validateHex = (str: string): boolean =>{
    return /[0-9a-fA-F]{32}/.test(str)
}

export const validateIdentifier = (str: string): boolean => {
    try {
        const bytes = base58.decode(str)

        return bytes.length === 64
    } catch (e) {
        return false
    }
}

export const popupWindow = (url, windowName, win, w, h)  => {
    const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2)
    const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2)
    //return win.open(url, windowName, `popup, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
    return win.open(url, windowName, `popup, width=${w}, height=${h}, top=${y}, left=${x}`)
}
