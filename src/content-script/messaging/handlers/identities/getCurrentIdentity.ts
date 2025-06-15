import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {PayloadNotValidError} from "../../../errors/PayloadNotValidError";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {GetCurrentIdentityResponse} from "../../../../types/messages/response/GetCurrentIdentityResponse";
import {GetCurrentIdentityPayload} from "../../../../types/messages/payloads/GetCurrentIdentityPayload";

export class GetCurrentIdentityHandler implements MessageBackendHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<GetCurrentIdentityResponse> {
        const identity = await this.identitiesRepository.getCurrentIdentity()

        return {currentIdentity: identity.identifier}
    }

    validatePayload(payload: GetCurrentIdentityPayload): null | string {
        return null
    }
}
