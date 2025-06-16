import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";
import {GetAvailableIdentitiesResponse} from "../../../../types/messages/response/GetAvailableIdentitiesResponse";
import {GetAvailableIdentitiesPayload} from "../../../../types/messages/payloads/GetAvailableIdentitiesPayload";
import {APIHandler} from "../../APIHandler";

export class GetAvailableIdentitiesHandler implements APIHandler{
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
