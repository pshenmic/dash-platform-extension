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
import {ExtensionStorageAdapter} from "./storage/extensionStorageAdapter";

export class MessagingBackend {
    dpp: DashPlatformProtocolWASM

    constructor(dpp) {
        this.dpp = dpp
    }

    handlers: {
        [key: string]: Function
    }

    init() {
        const walletId = '1'
        const network = 'testnet'

        const storageAdapter = new ExtensionStorageAdapter()

        const appConnectRepository = new AppConnectRepository(walletId, network, storageAdapter)
        const identitiesRepository = new IdentitiesRepository(walletId, network, storageAdapter)
        const stateTransitionsRepository = new StateTransitionsRepository(walletId, network, storageAdapter)

        this.handlers = {
            [MessagingMethods.CONNECT_APP]: connectAppHandler(appConnectRepository),
            [MessagingMethods.GET_IDENTITIES]: getIdentitiesHandler(identitiesRepository),
            [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: requestStateTransitionApprovalHandler(stateTransitionsRepository, this.dpp),
            [MessagingMethods.GET_APP_CONNECT]: getAppConnectHandler(appConnectRepository),
        }

        window.addEventListener('message', (event: MessageEvent) => {
            const data = event.data as EventData

            const {context} = data

            if (context !== 'dash-platform-extension') {
                return
            }

            const {id, method, payload, error} = data

            const handler = this.handlers[event.data.method]

            if (!handler) {
                const message: EventData = {
                    id,
                    context: 'dash-platform-extension',
                    target: 'webpage',
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
                        target: 'webpage',
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
                        target: 'webpage',
                        method,
                        payload: null,
                        error: e.message
                    }

                    window.postMessage(message)
                })
        }, true)
    }
}
