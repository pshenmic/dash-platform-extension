import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {EventData} from "../../../../types/EventData";
import {GetCurrentIdentityResponse} from "../../../../types/messages/response/GetCurrentIdentityResponse";
import {APIHandler} from "../../APIHandler";
import {EmptyPayload} from "../../../../types/messages/payloads/EmptyPayload";

export class GetCurrentIdentityHandler implements APIHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(): Promise<GetCurrentIdentityResponse> {
        const identity = await this.identitiesRepository.getCurrent()

        if (!identity) {
            return {currentIdentity: identity.identifier}
        }

        return {currentIdentity: null}
    }

    validatePayload(payload: EmptyPayload): null | string {
        return null
    }
}
