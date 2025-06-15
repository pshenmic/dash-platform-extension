import {EventData} from "../types/EventData";
import {AppConnectRepository} from "./repository/AppConnectRepository";
import {IdentitiesRepository} from "./repository/IdentitiesRepository";
import {StateTransitionsRepository} from "./repository/StateTransitionsRepository";
import {MessagingMethods} from "../types/enums/MessagingMethods";
import {StorageAdapter} from "./storage/storageAdapter";
import {PayloadNotValidError} from "./errors/PayloadNotValidError";
import {ConnectAppHandler} from "./messaging/handlers/appConnect/connectApp";
import {
    RequestStateTransitionApprovalHandler
} from "./messaging/handlers/stateTransitions/requestStateTransitionApproval";
import {GetCurrentIdentityHandler} from "./messaging/handlers/identities/getCurrentIdentity";
import {GetStateTransitionHandler} from "./messaging/handlers/stateTransitions/getStateTransition";
import {ApproveStateTransitionHandler} from "./messaging/handlers/stateTransitions/approveStateTransition";
import {RejectStateTransitionHandler} from "./messaging/handlers/stateTransitions/rejectStateTransition";
import {Network} from "../types/enums/Network";
import DashPlatformSDK from 'dash-platform-sdk'
import {ImportIdentityHandler} from "./messaging/handlers/identities/importIdentity";
import {GetAvailableIdentitiesHandler} from "./messaging/handlers/identities/getAvailableIdentities";

export interface MessageBackendHandler {
    handle(event: EventData) : Promise<any>
    validatePayload(payload: any) : null | string
}

export class MessagingBackend {
    sdk: DashPlatformSDK
    storageAdapter: StorageAdapter

    constructor(sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
        this.sdk = sdk
        this.storageAdapter = storageAdapter
    }

    handlers: {
        [key: string]: MessageBackendHandler
    }

    init() {
        const walletId = '1'
        const network = Network.testnet

        const appConnectRepository = new AppConnectRepository(walletId, network, this.storageAdapter)
        const identitiesRepository = new IdentitiesRepository(walletId, network, this.storageAdapter)
        const stateTransitionsRepository = new StateTransitionsRepository(walletId, network, this.storageAdapter)

        this.handlers = {
            [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository),
            [MessagingMethods.IMPORT_IDENTITY]: new ImportIdentityHandler(identitiesRepository, this.sdk.dpp),
            [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(identitiesRepository),
            [MessagingMethods.GET_AVAILABLE_IDENTITIES]: new GetAvailableIdentitiesHandler(identitiesRepository),
            [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(stateTransitionsRepository, this.sdk.dpp),
            [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
            [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository,  this.sdk, network),
            [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository),
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
