import {EventData} from "../../../../types/EventData";
import {validateIdentifier} from "../../../../utils";
import {APIHandler} from "../../APIHandler";
import {SwitchIdentityPayload} from "../../../../types/messages/payloads/SwitchIdentityPayload";
import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {VoidResponse} from "../../../../types/messages/response/VoidResponse";

export class SwitchIdentityHandler implements APIHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<VoidResponse> {
        const payload: SwitchIdentityPayload = event.payload

        await this.identitiesRepository.switchIdentity(payload.identity)

        return {}
    }

    validatePayload(payload: SwitchIdentityPayload): string | null {
        if(!validateIdentifier(payload.identity)) {
            return `Invalid identity identifier: ${payload.identity}`
        }

        return null
    }
}
