import {base58} from "@scure/base";
import hash from "hash.js";

export const getRunningEnv = () => {
    let getBackgroundPage = chrome?.extension?.getBackgroundPage;

    if (getBackgroundPage){
        return getBackgroundPage() === window ? 'BACKGROUND' : 'POPUP';
    }

    return chrome?.runtime?.onMessage ? 'CONTENT' : 'WEB';
};

export const hexToBytes = (hex: string): Uint8Array => {
    return Uint8Array.from((hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)))
}

export const bytesToHex = (bytes: Uint8Array): string  => {
    return Array.prototype.map.call(bytes, (x: number) => ('00' + x.toString(16)).slice(-2)).join('')
}

export const validateHex = (str: string): boolean =>{
    return /[0-9a-fA-F]{32}/.test(str)
}

export const validateWalletId = (walletId: string): boolean =>{
    return /[0-9a-fA-F]{6}/.test(walletId)
}
export const generateWalletId = (): string => {
    return hash.sha256().update(new Date().getTime() + '').digest('hex').substring(0, 6)
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
