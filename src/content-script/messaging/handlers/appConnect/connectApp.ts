import {AppConnectRepository} from "../../../repository/AppConnectRepository";
import {ConnectAppResponse} from "../../../../types/messages/response/ConnectAppResponse";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import ipValidator from 'is-my-ip-valid'

const validateIp = ipValidator({ version: 4 })

interface AppConnectRequestPayload {
    url: string
}

export class ConnectAppHandler implements MessageBackendHandler {
    appConnectRepository: AppConnectRepository

    constructor(appConnectRepository: AppConnectRepository) {
        this.appConnectRepository = appConnectRepository
    }

    async handle(event: EventData): Promise<ConnectAppResponse> {
        const payload: AppConnectRequestPayload = event.payload

        const appConnect = await this.appConnectRepository.create(payload.url)

        return {redirectUrl: chrome.runtime.getURL(`connect.html`), appConnect}
    }

    validatePayload(payload: AppConnectRequestPayload): boolean {
        // check it is a string
        if (typeof payload?.url !== 'string') {
            return false
        }

        // checks it starts with http:// or https://
        if (!payload.url.startsWith('http://') && !payload.url.startsWith('https://')) {
            return false
        }

        const [, domainOrIpWithPort] = payload.url.split('://')
        const [domainOrIp, port] = domainOrIpWithPort.split(':')

        if (port && isNaN(Number(port)) || Number(port) > 65535) {
            return false
        }

        if (domainOrIp === 'localhost') {
            return true
        }

        // check it is domain (ex. google.com) or ip address (ipv6 or ipv4)
        return (/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i.test(domainOrIp) || validateIp(domainOrIp))
    }
}
