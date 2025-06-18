import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {EventData} from "../../../../types/EventData";
import {GetCurrentIdentityResponse} from "../../../../types/messages/response/GetCurrentIdentityResponse";
import {GetCurrentIdentityPayload} from "../../../../types/messages/payloads/GetCurrentIdentityPayload";
import {APIHandler} from "../../APIHandler";

export class GetCurrentIdentityHandler implements APIHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<GetCurrentIdentityResponse> {
        const identity = await this.identitiesRepository.getCurrentIdentity()

        return {currentIdentity: identity ? identity?.identifier : null}
    }

    validatePayload(payload: GetCurrentIdentityPayload): null | string {
        return null
    }
}
