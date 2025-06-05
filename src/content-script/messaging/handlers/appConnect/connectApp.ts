import {AppConnectRepository} from "../../../repository/AppConnectRepository";
import {ConnectAppResponse} from "../../../../types/messages/response/ConnectAppResponse";
import {EventData} from "../../../../types/EventData";

interface AppConnectRequestPayload {
    url: string
}

const validatePayload = (payload: AppConnectRequestPayload) => {
    // todo validate url
    return payload && typeof payload.url === 'string'
}

export default function connectAppHandler(appConnectRepository: AppConnectRepository) {
    return async (data: EventData): Promise<ConnectAppResponse> => {
        const payload: AppConnectRequestPayload = data.payload

        if (!validatePayload(payload)) {
            throw new Error('AppConnectRequestPayload is not valid')
        }

        const appConnect = await appConnectRepository.create(payload.url)

        return {redirectUrl: chrome.runtime.getURL(`connect.html`), appConnect}
    }
}
