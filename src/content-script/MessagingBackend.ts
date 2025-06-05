import {EventData} from "../types/EventData";
import {AppConnectRepository} from "./repository/AppConnectRepository";
import {IdentitiesRepository} from "./repository/IdentitiesRepository";
import {StateTransitionsRepository} from "./repository/StateTransitionsRepository";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {MessagingMethods} from "../types/enums/MessagingMethods";
import connectAppHandler from "./messaging/handlers/appConnect/connectApp";
import getIdentitiesHandler from "./messaging/handlers/identities/getIdentities";
import requestStateTransitionApprovalHandler
    from "./messaging/handlers/stateTransitions/requestStateTransitionApproval";
import getAppConnectHandler from "./messaging/handlers/appConnect/getAppConnect";
import {StorageAdapter} from "./storage/storageAdapter";

export class MessagingBackend {
    dpp: DashPlatformProtocolWASM
    storageAdapter: StorageAdapter

    constructor(dpp: DashPlatformProtocolWASM, storageAdapter: StorageAdapter) {
        this.dpp = dpp
        this.storageAdapter = storageAdapter
    }

    handlers: {
        [key: string]: Function
    }

    init() {
        const walletId = '1'
        const network = 'testnet'

        const appConnectRepository = new AppConnectRepository(walletId, network, this.storageAdapter)
        const identitiesRepository = new IdentitiesRepository(walletId, network, this.storageAdapter)
        const stateTransitionsRepository = new StateTransitionsRepository(walletId, network, this.storageAdapter)

        this.handlers = {
            [MessagingMethods.CONNECT_APP]: connectAppHandler(appConnectRepository),
            [MessagingMethods.GET_IDENTITIES]: getIdentitiesHandler(identitiesRepository),
            [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: requestStateTransitionApprovalHandler(stateTransitionsRepository, this.dpp),
            [MessagingMethods.GET_APP_CONNECT]: getAppConnectHandler(appConnectRepository),
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

            // todo validate input fields

            handler(data)
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
