import {AppConnectRepository} from "../../../repository/AppConnectRepository";
import {ConnectAppResponse} from "../../../../types/messages/response/ConnectAppResponse";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {GetAppConnectPayload} from "../../../../types/messages/payloads/GetAppConnectPayload";

export class GetAppConnectHandler implements MessageBackendHandler {
    appConnectRepository: AppConnectRepository

    constructor(appConnectRepository: AppConnectRepository) {
        this.appConnectRepository = appConnectRepository
    }

    async handle(event: EventData): Promise<ConnectAppResponse> {
        const payload: GetAppConnectPayload = event.payload

        const appConnect = await this.appConnectRepository.get(payload.id)

        return {redirectUrl: chrome.runtime.getURL(`connect.html`), appConnect}
    }

    async validatePayload(payload: GetAppConnectPayload): Promise<boolean> {
        // todo validate url
        return payload && typeof payload.id === 'string'
    }
}
