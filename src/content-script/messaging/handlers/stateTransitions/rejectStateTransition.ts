import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {EventData} from "../../../../types/EventData";
import {RejectStateTransitionResponse} from "../../../../types/messages/response/RejectStateTransitionResponse";
import {RejectStateTransitionPayload} from "../../../../types/messages/payloads/RejectStateTransitionPayload";
import {StateTransition} from "../../../../types/StateTransition";

export default function rejectStateTransitionHandler(stateTransitionsRepository: StateTransitionsRepository, dpp: DashPlatformProtocolWASM) {
    return async (data: EventData): Promise<RejectStateTransitionResponse> => {
        const payload: RejectStateTransitionPayload = data.payload

        const stateTransition: StateTransition = await stateTransitionsRepository.get(payload.hash)

        return {
            stateTransition: await stateTransitionsRepository.markRejected(stateTransition.hash)
        }
    }
}
