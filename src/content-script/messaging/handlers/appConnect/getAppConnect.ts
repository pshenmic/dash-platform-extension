import {AppConnectRepository} from "../../../repository/AppConnectRepository";
import {EventData} from "../../../../types/EventData";
import {ConnectAppResponse} from "../../../../types/messages/response/ConnectAppResponse";

interface GetAppConnectPayload {
    id: string
}

const validatePayload = (payload: GetAppConnectPayload) => {
    // todo validate url
    return payload && typeof payload.id === 'string'
}

export default function getAppConnectHandler(appConnectRepository: AppConnectRepository) {
    return async (data: EventData): Promise<ConnectAppResponse> => {
        const payload: GetAppConnectPayload = data.payload

        if (!validatePayload(payload)) {
            throw new Error('AppConnectRequestPayload is not valid')
        }

        const appConnect = await appConnectRepository.get(payload.id)

        return {redirectUrl: chrome.runtime.getURL(`connect.html`), appConnect}
    }
}
