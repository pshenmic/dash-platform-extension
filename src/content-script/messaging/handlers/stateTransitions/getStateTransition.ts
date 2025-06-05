import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {EventData} from "../../../../types/EventData";
import {StateTransition} from "../../../../types/StateTransition";
import {GetStateTransitionResponse} from "../../../../types/messages/response/GetStateTransitionResponse";
import {GetStateTransitionPayload} from "../../../../types/messages/payloads/GetStateTransitionPayload";

export default function rejectStateTransitionHandler(stateTransitionsRepository: StateTransitionsRepository, dpp: DashPlatformProtocolWASM) {
    return async (data: EventData): Promise<GetStateTransitionResponse> => {
        const payload: GetStateTransitionPayload = data.payload

        const stateTransition: StateTransition = await stateTransitionsRepository.get(payload.hash)

        return {
            stateTransition
        }
    }
}
