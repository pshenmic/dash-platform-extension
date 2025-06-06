import {AppConnectRepository} from "../../../repository/AppConnectRepository";
import {ConnectAppResponse} from "../../../../types/messages/response/ConnectAppResponse";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";

interface AppConnectRequestPayload {
    url: string
}

export class ConnectAppHandler implements MessageBackendHandler{
    appConnectRepository: AppConnectRepository

    constructor(appConnectRepository: AppConnectRepository) {
        this.appConnectRepository = appConnectRepository
    }

    async handle(event: EventData): Promise<ConnectAppResponse> {
        const payload: AppConnectRequestPayload = event.payload

        const appConnect = await this.appConnectRepository.create(payload.url)

        return {redirectUrl: chrome.runtime.getURL(`connect.html`), appConnect}
    }

    async validatePayload(payload: AppConnectRequestPayload): Promise<boolean> {
        // todo validate url
        return payload && typeof payload.url === 'string'
    }
}
