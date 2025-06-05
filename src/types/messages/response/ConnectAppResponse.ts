import {AppConnect} from "../../AppConnect";

export class ConnectAppResponse  {

    constructor(appConnect: AppConnect, redirectUrl: string) {
        this.appConnect = appConnect;
        this.redirectUrl = redirectUrl;
    }

    appConnect: AppConnect
    redirectUrl: string
}
