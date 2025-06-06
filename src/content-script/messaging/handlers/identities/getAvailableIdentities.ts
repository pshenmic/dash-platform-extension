import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {GetAvailableIdentitiesResponse} from "../../../../types/messages/response/GetAvailableIdentitiesResponse";
import {GetAvailableIdentitiesPayload} from "../../../../types/messages/payloads/GetAvailableIdentitiesPayload";

export class GetAvailableIdentitiesHandler implements MessageBackendHandler{
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<GetAvailableIdentitiesResponse> {
        const identities = await this.identitiesRepository.getAll()

        return {identities: identities.map((identity: Identity) => identity.identifier)}
    }

    validatePayload(payload: GetAvailableIdentitiesPayload): null | string {
        return null
    }
}
