import {MESSAGING_TIMEOUT} from "../constants";
import {StateTransitionWASM} from "pshenmic-dpp";
import {EventData} from "./EventData";
import {MessagingMethods} from "./enums/MessagingMethods";
import {ConnectAppResponse} from "./messages/response/ConnectAppResponse";
import {RequestStateTransitionApprovalResponse} from "./messages/response/RequestStateTransitionApprovalResponse";
import {GetStateTransitionResponse} from "./messages/response/GetStateTransitionResponse";
import {GetCurrentIdentityResponse} from "./messages/response/GetCurrentIdentityResponse";
import {ConnectAppPayload} from "./messages/payloads/ConnectAppPayload";

export class MessagingAPI {
    async requestStateTransitionApproval(stateTransition: StateTransitionWASM): Promise<RequestStateTransitionApprovalResponse> {
        return await this._rpcCall(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL,
            {
                base64: stateTransition.toBytes()
            })
    }

    async getStateTransition(hash: string): Promise<GetStateTransitionResponse> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_STATE_TRANSITION, {hash})

        return eventData.payload
    }

    async connectApp(url: string): Promise<ConnectAppResponse> {
        const payload: ConnectAppPayload = {url}

        const response: ConnectAppResponse = await this._rpcCall(MessagingMethods.CONNECT_APP, {url})

        return {
            appConnect: response.appConnect,
            redirectUrl: response.redirectUrl
        }
    }

    async getAppConnect(id: string): Promise<ConnectAppResponse> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_APP_CONNECT, {id})

        return eventData.payload
    }

    async getCurrentIdentity(): Promise<GetCurrentIdentityResponse> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_CURRENT_IDENTITY, {})

        return eventData.payload
    }

    _rpcCall<T>(method: string, payload?: object): Promise<T> {
        console.log(`RPC call to extension with method ${method} payload ${JSON.stringify(payload)}`)
        const id = new Date().getTime() + ''

        return new Promise((resolve, reject) => {
            const rejectWithError = (message: string) => {
                window.removeEventListener('message', handleMessage)

                reject(message)
            }

            const handleMessage = (event: MessageEvent) => {
                const data: EventData = event.data

                if (data.type === 'response' && data.id === id) {
                    if (data.error) {
                        return rejectWithError(data.error)
                    }

                    window.removeEventListener('message', handleMessage)

                    resolve(data.payload)
                }
            }

            window.addEventListener('message', handleMessage)

            setTimeout(() => {
                rejectWithError(`Timed out waiting for response of ${method}, (${payload})`)
            }, MESSAGING_TIMEOUT)

            const message : EventData = {
                context: "dash-platform-extension",
                id,
                method,
                payload,
                type: "request"
            }

            window.postMessage(message)
        })
    }
}

