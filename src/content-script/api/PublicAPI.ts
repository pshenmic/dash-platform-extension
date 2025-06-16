import {DashPlatformSDK} from 'dash-platform-sdk'
import {EventData} from "../../types/EventData";
import {StorageAdapter} from "../storage/storageAdapter";
import {AppConnectRepository} from "../repository/AppConnectRepository";
import {StateTransitionsRepository} from "../repository/StateTransitionsRepository";
import {MessagingMethods} from "../../types/enums/MessagingMethods";
import {ConnectAppHandler} from "./public/connectApp";
import {PayloadNotValidError} from "../errors/PayloadNotValidError";
import {APIHandler} from "./APIHandler";
import {RequestStateTransitionApprovalHandler} from "./public/requestStateTransitionApproval";

/**
 * Handlers for a messages from a webpage to extension (potentially insecure)
 */
export class PublicAPI {
    sdk: DashPlatformSDK
    storageAdapter: StorageAdapter

    constructor(sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
        this.sdk = sdk
        this.storageAdapter = storageAdapter
    }

    handlers: {
        [key: string]: APIHandler
    }

    init() {
        const appConnectRepository = new AppConnectRepository(this.storageAdapter)
        const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter, this.sdk.dpp)

        this.handlers = {
            [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository),
            [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(stateTransitionsRepository, this.sdk.dpp),
        }


        window.addEventListener('message', (event: MessageEvent) => {
            const data = event.data as EventData

            const {context, type} = data

            if (context !== 'dash-platform-extension' || type === 'response') {
                return
            }

            const {id, method, payload, error} = data

            const handler = this.handlers[event.data.method]

            if (!handler) {
                const message: EventData = {
                    id,
                    context: 'dash-platform-extension',
                    type: 'response',
                    method,
                    payload: null,
                    error: 'Could not find handler for method ' + method
                }

                return window.postMessage(message)
            }

            const validation = handler.validatePayload(payload)

            if (validation) {
                throw new PayloadNotValidError(validation)
            }

            handler.handle(data)
                .then((result: any) => {
                    const message: EventData = {
                        id,
                        context: 'dash-platform-extension',
                        type: 'response',
                        method,
                        payload: result,
                        error: null
                    }

                    window.postMessage(message)
                })
                .catch(e => {
                    const message: EventData = {
                        id,
                        context: 'dash-platform-extension',
                        type: 'response',
                        method,
                        payload: null,
                        error: e.message
                    }

                    window.postMessage(message)
                })
        }, true)
    }
}
