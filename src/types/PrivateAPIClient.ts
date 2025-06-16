import {MESSAGING_TIMEOUT} from "../constants";
import {EventData} from "./EventData";
import {MessagingMethods} from "./enums/MessagingMethods";
import {ConnectAppResponse} from "./messages/response/ConnectAppResponse";
import {RequestStateTransitionApprovalResponse} from "./messages/response/RequestStateTransitionApprovalResponse";
import {GetStateTransitionResponse} from "./messages/response/GetStateTransitionResponse";
import {GetCurrentIdentityResponse} from "./messages/response/GetCurrentIdentityResponse";
import {IdentifierWASM} from 'pshenmic-dpp'
import {CreateIdentityPayload} from "./messages/payloads/CreateIdentityPayload";
import {GetAvailableIdentitiesResponse} from "./messages/response/GetAvailableIdentitiesResponse";

export class PrivateAPIClient {
    async requestStateTransitionApproval(base64: string): Promise<RequestStateTransitionApprovalResponse> {
        return await this._rpcCall(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL,
            {
                base64
            })
    }

    async approveStateTransition(hash: string, identity: string): Promise<void> {
        await this._rpcCall(MessagingMethods.APPROVE_STATE_TRANSITION,
            {
                hash,
                identity
            })
    }

    async rejectStateTransition(hash: string): Promise<void> {
        await this._rpcCall(MessagingMethods.REJECT_STATE_TRANSITION,
            {
                hash,
            })
    }

    async getStateTransition(hash: string): Promise<GetStateTransitionResponse> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_STATE_TRANSITION, {hash})

        return eventData.payload
    }

    async connectApp(url: string): Promise<ConnectAppResponse> {
        const response: ConnectAppResponse = await this._rpcCall(MessagingMethods.CONNECT_APP, {url})

        return {
            status: response.status,
            redirectUrl: response.redirectUrl
        }
    }

    async getCurrentIdentity(): Promise<IdentifierWASM> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_CURRENT_IDENTITY, {})

        const payload: GetCurrentIdentityResponse = eventData.payload

        return new IdentifierWASM(payload.currentIdentity)
    }

    async getAvailableIdentities(): Promise<IdentifierWASM[]> {
        const eventData: EventData = await this._rpcCall(MessagingMethods.GET_AVAILABLE_IDENTITIES, {})

        const payload: GetAvailableIdentitiesResponse = eventData.payload

        return payload.identities.map((identity: string) => new IdentifierWASM(identity))
    }

    _rpcCall<T>(method: string, payload?: object): Promise<T> {
        console.log(`RPC call to extension with method ${method} payload ${JSON.stringify(payload)}`)


        const id = new Date().getTime() + ''

        const message: EventData = {
            context: "dash-platform-extension",
            id,
            method,
            payload,
            type: "request"
        }


        return new Promise((resolve, reject) => {
            const rejectWithError = (message: string) => {
                reject(message)
            }

            setTimeout(() => {
                rejectWithError(`Timed out waiting for response of ${method}, (${payload})`)
            }, MESSAGING_TIMEOUT)

            chrome.runtime.sendMessage(undefined, message, undefined, (data: EventData) => {


                if (data.type === 'response' && data.id === id) {
                    if (data.error) {
                        return rejectWithError(data.error)
                    }

                    resolve(data.payload)
                }

                const message: EventData = {
                    context: "dash-platform-extension",
                    id,
                    method,
                    payload,
                    type: "request"
                }

                resolve(message.payload)
            })
        })
    }
}

