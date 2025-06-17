import {MESSAGING_TIMEOUT} from "../constants";
import {EventData} from "./EventData";
import {MessagingMethods} from "./enums/MessagingMethods";
import {GetStateTransitionResponse} from "./messages/response/GetStateTransitionResponse";
import {GetCurrentIdentityResponse} from "./messages/response/GetCurrentIdentityResponse";
import {IdentifierWASM} from 'pshenmic-dpp'
import {GetAvailableIdentitiesResponse} from "./messages/response/GetAvailableIdentitiesResponse";
import {GetStatusResponse} from "./messages/response/GetStatusResponse";
import {SetupPasswordPayload} from "./messages/payloads/SetupPasswordPayload";

export class PrivateAPIClient {
    async getStatus(): Promise<GetStatusResponse> {
        return this._rpcCall(MessagingMethods.GET_STATUS, {})
    }

    async setupPassword(password: string): Promise<GetStatusResponse> {
        const payload: SetupPasswordPayload = {
            password
        }

        return this._rpcCall(MessagingMethods.SETUP_PASSWORD, payload)
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

        return new Promise((resolve, reject) => {
            const rejectWithError = (message: string) => {
                chrome.runtime.onMessage.removeListener(handleMessage)

                reject(message)
            }

            const handleMessage = (data: EventData) => {
                if (data.type === 'response' && data.id === id) {
                    if (data.error) {
                        return rejectWithError(data.error)
                    }

                    chrome.runtime.onMessage.removeListener(handleMessage)

                    resolve(data.payload)
                }
            }

            chrome.runtime.onMessage.addListener(handleMessage)

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

            // @ts-ignore
            chrome.runtime.onMessage.dispatch(message)
        })
    }
}

