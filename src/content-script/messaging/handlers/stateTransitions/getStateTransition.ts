import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {GetStateTransitionPayload} from "../../../../types/messages/payloads/GetStateTransitionPayload";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";

export class GetStateTransitionHandler implements MessageBackendHandler{
    stateTransitionsRepository: StateTransitionsRepository

    constructor(stateTransitionsRepository: StateTransitionsRepository) {
        this.stateTransitionsRepository = stateTransitionsRepository
    }

    async handle(event: EventData): Promise<Identity[]> {
        const payload: GetStateTransitionPayload = event.payload

        return this.stateTransitionsRepository.get(payload.hash)
    }

    async validatePayload(key: object): Promise<boolean> {
        return true
    }
}
