import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {PayloadNotValidError} from "../../../errors/PayloadNotValidError";
import {MessageBackendHandler} from "../../../MessagingBackend";

export class GetCurrentIdentityHandler implements MessageBackendHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<Identity> {
        return this.identitiesRepository.getCurrentIdentity()
    }

    async validatePayload(key: object): Promise<boolean> {
        return true
    }
}
