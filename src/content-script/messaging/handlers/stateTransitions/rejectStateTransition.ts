import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {EventData} from "../../../../types/EventData";
import {RejectStateTransitionResponse} from "../../../../types/messages/response/RejectStateTransitionResponse";
import {RejectStateTransitionPayload} from "../../../../types/messages/payloads/RejectStateTransitionPayload";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {validateHex} from "../../../../utils";

export class RejectStateTransitionHandler implements MessageBackendHandler{
    stateTransitionsRepository: StateTransitionsRepository

    constructor(stateTransitionsRepository: StateTransitionsRepository) {
        this.stateTransitionsRepository = stateTransitionsRepository
    }

    async handle(event: EventData): Promise<RejectStateTransitionResponse> {
        const payload: RejectStateTransitionPayload = event.payload

        return {
            stateTransition: await this.stateTransitionsRepository.markRejected(payload.hash)
        }
    }

    validatePayload(payload: RejectStateTransitionPayload): null|string{
        if(!validateHex(payload.hash)) {
            return 'State transition hash is not valid'
        }

        return null
    }
}
