import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {PayloadNotValidError} from "../../../errors/PayloadNotValidError";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {GetCurrentIdentityResponse} from "../../../../types/messages/response/GetCurrentIdentityResponse";

export class GetCurrentIdentityHandler implements MessageBackendHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<GetCurrentIdentityResponse> {
        return {currentIdentity: await this.identitiesRepository.getCurrentIdentity()}
    }

    validatePayload(key: object): boolean {
        return true
    }
}
