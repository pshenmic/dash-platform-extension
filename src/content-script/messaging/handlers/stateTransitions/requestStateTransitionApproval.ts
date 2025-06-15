import {
    RequestStateTransitionApprovalPayload
} from "../../../../types/messages/payloads/RequestStateTransitionApprovalPayload";
import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {
    RequestStateTransitionApprovalResponse
} from "../../../../types/messages/response/RequestStateTransitionApprovalResponse";
import {DashPlatformProtocolWASM, StateTransitionWASM} from 'dash-platform-sdk'
import {base64} from '@scure/base'

export class RequestStateTransitionApprovalHandler implements MessageBackendHandler {
    stateTransitionsRepository: StateTransitionsRepository
    dpp: DashPlatformProtocolWASM

    constructor(stateTransitionsRepository: StateTransitionsRepository, dpp: DashPlatformProtocolWASM) {
        this.stateTransitionsRepository = stateTransitionsRepository
        this.dpp = dpp
    }

    async handle(event: EventData): Promise<RequestStateTransitionApprovalResponse> {
        const payload: RequestStateTransitionApprovalPayload = event.payload

        const stateTransition = await this.stateTransitionsRepository.create(payload.base64)

        return {
            stateTransition: stateTransition,
            redirectUrl: chrome.runtime.getURL(`index.html/#approve/${stateTransition.hash}`)
        }
    }

    validatePayload(payload: RequestStateTransitionApprovalPayload): null | string {
        if (!payload.base64 || typeof payload.base64 !== 'string') {
            return 'State transition base64 is not string'
        }

        let bytes = null

        try {
            bytes = base64.decode(payload.base64)
        } catch (e) {
            return 'Base64 string is not valid'
        }

        try {
            this.dpp.StateTransitionWASM.fromBytes(bytes)
        } catch (e) {
            return 'Failed to deserialize state transition from base64'
        }

        return null
    }
}
