import {EventData} from "../../types/EventData";
import {AppConnectRepository} from "../repository/AppConnectRepository";
import {IdentitiesRepository} from "../repository/IdentitiesRepository";
import {StateTransitionsRepository} from "../repository/StateTransitionsRepository";
import {MessagingMethods} from "../../types/enums/MessagingMethods";
import {StorageAdapter} from "../storage/storageAdapter";
import {PayloadNotValidError} from "../errors/PayloadNotValidError";
import {DashPlatformSDK} from 'dash-platform-sdk'
import MessageSender = chrome.runtime.MessageSender;
import {Network} from "../../types/enums/Network";
import {GetCurrentIdentityHandler} from "./private/identities/getCurrentIdentity";
import {GetAvailableIdentitiesHandler} from "./private/identities/getAvailableIdentities";
import {GetStateTransitionHandler} from "./private/stateTransitions/getStateTransition";
import {ApproveStateTransitionHandler} from "./private/stateTransitions/approveStateTransition";
import {RejectStateTransitionHandler} from "./private/stateTransitions/rejectStateTransition";
import {APIHandler} from "./APIHandler";
import {CreateIdentityHandler} from "./private/identities/createIdentity";
import {CreateWalletHandler} from "./private/wallet/createWallet";
import {SwitchWalletHandler} from "./private/wallet/switchWallet";
import {KeypairRepository} from "../repository/KeypairRepository";
import {WalletRepository} from "../repository/WalletRepository";
import {GetStatusHandler} from "./private/extension/status";

/**
 * Handlers for a messages within extension context
 */
export class PrivateAPI {
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
        const walletRepository = new WalletRepository(this.storageAdapter)
        const keypairRepository = new KeypairRepository(this.storageAdapter, this.sdk.dpp)
        const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk.dpp)
        const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter, this.sdk.dpp)

        this.handlers = {
            [MessagingMethods.GET_STATUS]: new GetStatusHandler(this.storageAdapter),
            [MessagingMethods.CREATE_IDENTITY]: new CreateIdentityHandler(identitiesRepository, keypairRepository, this.sdk.dpp),
            [MessagingMethods.GET_AVAILABLE_IDENTITIES]: new GetAvailableIdentitiesHandler(identitiesRepository),
            [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(identitiesRepository),
            [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository, walletRepository, keypairRepository, this.sdk.dpp),
            [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
            [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository, walletRepository),
            [MessagingMethods.CREATE_WALLET]: new CreateWalletHandler(walletRepository, this.sdk.dpp),
            [MessagingMethods.SWITCH_WALLET]: new SwitchWalletHandler(walletRepository, this.sdk.dpp),
        }

        chrome.runtime.onMessage.addListener((data: EventData) => {
            const {context, type} = data

            if (context !== 'dash-platform-extension' || type === 'response') {
            return
        }

        const {id, method, payload, error} = data

        const handler = this.handlers[data.method]

        if (!handler) {
            const message: EventData = {
                id,
                context: 'dash-platform-extension',
                type: 'response',
                method,
                payload: null,
                error: 'Could not find handler for method ' + method
            }

            // @ts-ignore
            return chrome.runtime.onMessage.dispatch(message)
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

                // @ts-ignore
                return chrome.runtime.onMessage.dispatch(message)
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

                // @ts-ignore
                return chrome.runtime.onMessage.dispatch(message)
            })
    })

    }
}
