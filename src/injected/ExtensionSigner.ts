import {AbstractSigner} from "dash-platform-sdk";
import {DashPlatformProtocolWASM, StateTransitionWASM} from "pshenmic-dpp";
import {popupWindow} from "../utils";
import {MessagingAPI} from "../types/MessagingAPI";
import {MESSAGING_TIMEOUT} from "../constants";
import {StateTransitionStatus} from "../types/enums/StateTransitionStatus";

export class ExtensionSigner implements AbstractSigner {
    messagingAPI: MessagingAPI
    wasm: DashPlatformProtocolWASM

    constructor(messagingAPI: MessagingAPI, wasm: DashPlatformProtocolWASM) {
        this.messagingAPI = messagingAPI
        this.wasm = wasm
    }

    async connect(url: string): Promise<void> {
        const response = await this.messagingAPI.connectApp(url)

        let {appConnect, redirectUrl} = response

        popupWindow(response.redirectUrl, 'connect', window, 300, 300)

        const startTimestamp = new Date()

        while (appConnect.status === 'pending') {
            if (new Date().getTime() - startTimestamp.getTime() < MESSAGING_TIMEOUT) {
                throw new Error('Failed to connect app due timeout')
            }

            const appConnectResponse = await this.messagingAPI.getAppConnect(appConnect.id)

            appConnect = appConnectResponse.appConnect
        }

        if (appConnect.status === 'rejected') {
            throw new Error('Connection of the extension to the website was rejected')
        }
    }

    async signStateTransition(stateTransitionWASM: StateTransitionWASM) {
        const response = await this.messagingAPI.requestStateTransitionApproval(stateTransitionWASM)

        popupWindow(response.redirectUrl, 'approval', window, 300, 300)

        let stateTransition = response.stateTransition

        const startTimestamp = new Date()

        while (stateTransition.status === StateTransitionStatus.pending) {
            if (new Date().getTime() - startTimestamp.getTime() < MESSAGING_TIMEOUT) {
                throw new Error('Failed to receive state transition signing approval due timeout')
            }

            const getStateTransitionResponse = await this.messagingAPI.getStateTransition(stateTransition.hash)

            stateTransition = getStateTransitionResponse.stateTransition
        }

        if (stateTransition.status === StateTransitionStatus.rejected) {
            throw new Error('State transition signing error')
        }
    }
}

