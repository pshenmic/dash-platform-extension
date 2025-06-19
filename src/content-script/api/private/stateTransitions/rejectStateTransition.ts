import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {EventData} from "../../../../types/EventData";
import {RejectStateTransitionResponse} from "../../../../types/messages/response/RejectStateTransitionResponse";
import {RejectStateTransitionPayload} from "../../../../types/messages/payloads/RejectStateTransitionPayload";
import {validateHex} from "../../../../utils";
import {APIHandler} from "../../APIHandler";
import {WalletRepository} from "../../../repository/WalletRepository";
import {StateTransitionStatus} from "../../../../types/enums/StateTransitionStatus";

export class RejectStateTransitionHandler implements APIHandler {
    stateTransitionsRepository: StateTransitionsRepository
    walletRepository: WalletRepository

    constructor(stateTransitionsRepository: StateTransitionsRepository, walletRepository: WalletRepository) {
        this.stateTransitionsRepository = stateTransitionsRepository
        this.walletRepository = walletRepository
    }

    async handle(event: EventData): Promise<RejectStateTransitionResponse> {
        const payload: RejectStateTransitionPayload = event.payload

        const wallet = await this.walletRepository.getCurrent()

        if (!wallet) {
            throw new Error('No ')
        }

        return {
            stateTransition: await this.stateTransitionsRepository.update(payload.hash, StateTransitionStatus.rejected)
        }
    }

    validatePayload(payload: RejectStateTransitionPayload): null | string {
        if (!validateHex(payload.hash)) {
            return 'State transition hash is not valid'
        }

        return null
    }
}
