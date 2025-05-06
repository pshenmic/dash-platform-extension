import {base64} from "@scure/base";
import {EVENTS, MESSAGING_TIMEOUT} from "../constants";
import {EventData} from "../types/EventData";

export class ExtensionSigner {
    // todo StateTransitionWASM
    async signStateTransition(stateTransition: any) {
        const eventData: EventData = await this._rpcCall(
            EVENTS.SIGN_STATE_TRANSITION,
            {
                base64: stateTransition.toBytes()
            })

        window.postMessage({
            method: 'signStateTransition',
            payload: {base64: base64.encode(stateTransition.toBytes())}
        })

        console.log('Sent signStateTransition() method from webpage')
    }

    _rpcCall(method: string, payload: object): Promise<EventData> {
        return new Promise((resolve, reject) => {
            const rejectWithError = (message: string) => {
                window.removeEventListener('message', handleMessage)

                reject(message)
            }

            const handleMessage = (event: MessageEvent) => {
                const data: EventData = event.data

                if (event.data.target === 'window' && data.method === method) {
                    const {error} = event.data
                    const {base64} = event.data.payload

                    if (error) {
                        return rejectWithError(error)
                    }

                    resolve(base64)
                }
            }

            window.addEventListener('message', handleMessage)

            setTimeout(() => {
                rejectWithError(`Timed out waiting for response of ${method}, (${payload})`)
            }, MESSAGING_TIMEOUT)

            window.postMessage({
                method: 'signStateTransition',
                payload
            })

            console.log(`Sent ${method} message (${payload}) from webpage`)
        })
    }
}

