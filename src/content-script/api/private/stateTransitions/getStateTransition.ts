import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {GetStateTransitionPayload} from "../../../../types/messages/payloads/GetStateTransitionPayload";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {validateHex} from "../../../../utils";
import {APIHandler} from "../../APIHandler";

export class GetStateTransitionHandler implements APIHandler{
    stateTransitionsRepository: StateTransitionsRepository

    constructor(stateTransitionsRepository: StateTransitionsRepository) {
        this.stateTransitionsRepository = stateTransitionsRepository
    }

    async handle(event: EventData): Promise<Identity[]> {
        const payload: GetStateTransitionPayload = event.payload

        return this.stateTransitionsRepository.get(payload.hash)
    }

    validatePayload(payload: GetStateTransitionPayload): null | string {
        if (!validateHex(payload.hash))  {
            return 'State transition hash is not valid'
        }

        return null
    }
}
