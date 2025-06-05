import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {EventData} from "../../../../types/EventData";
import {StateTransition} from "../../../../types/StateTransition";
import {
    SignStateTransitionRequestPayload
} from "../../../../types/messages/payloads/RequestStateTransitionApprovalPayload";

export default function requestStateTransitionApprovalHandler(stateTransitionsRepostory: StateTransitionsRepository, dpp: DashPlatformProtocolWASM) {
    return async (data: EventData): Promise<StateTransition> => {
        const payload: SignStateTransitionRequestPayload = data.payload

        return stateTransitionsRepostory.create(payload.base64)
    }
}
