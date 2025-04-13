export const getRunningEnv = () => {
    let getBackgroundPage = chrome?.extension?.getBackgroundPage;
    if (getBackgroundPage){
        return getBackgroundPage() === window ? 'BACKGROUND' : 'POPUP';
    }
    return chrome?.runtime?.onMessage ? 'CONTENT' : 'WEB';
};


