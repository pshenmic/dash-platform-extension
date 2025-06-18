import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {EventData} from "../../../../types/EventData";
import {APIHandler} from "../../APIHandler";

export interface SetCurrentIdentityPayload {
    identifier: string
}

export interface SetCurrentIdentityResponse {}

export class SetCurrentIdentityHandler implements APIHandler {
    identitiesRepository: IdentitiesRepository

    constructor(identitiesRepository: IdentitiesRepository) {
        this.identitiesRepository = identitiesRepository
    }

    async handle(event: EventData): Promise<SetCurrentIdentityResponse> {
        const payload: SetCurrentIdentityPayload = event.payload

        await this.identitiesRepository.setCurrentIdentity(payload.identifier)

        return {}
    }

    validatePayload(payload: SetCurrentIdentityPayload): null | string {
        if (!payload.identifier) {
            return 'Identifier is required'
        }

        return null
    }
}
