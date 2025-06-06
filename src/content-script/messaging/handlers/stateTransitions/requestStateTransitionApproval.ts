import {
    SignStateTransitionRequestPayload
} from "../../../../types/messages/payloads/RequestStateTransitionApprovalPayload";
import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {
    RequestStateTransitionApprovalResponse
} from "../../../../types/messages/response/RequestStateTransitionApprovalResponse";

export class RequestStateTransitionApprovalHandler implements MessageBackendHandler {
    stateTransitionsRepository: StateTransitionsRepository

    constructor(stateTransitionsRepository: StateTransitionsRepository) {
        this.stateTransitionsRepository = stateTransitionsRepository
    }

    async handle(event: EventData): Promise<RequestStateTransitionApprovalResponse> {
        const payload: SignStateTransitionRequestPayload = event.payload

        const stateTransition = await this.stateTransitionsRepository.create(payload.base64)

        return {
            stateTransition: stateTransition,
            redirectUrl: chrome.runtime.getURL(`index.html/#approve/${stateTransition.hash}`)
        }
    }

    async validatePayload(payload: SignStateTransitionRequestPayload): Promise<boolean> {
        return true
    }
}
