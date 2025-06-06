import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {EventData} from "../../../../types/EventData";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {ImportIdentityPayload} from "../../../../types/messages/payloads/ImportIdentityPayload";
import {ImportIdentityResponse} from "../../../../types/messages/response/ImportIdentityResponse";
import {DashPlatformProtocolWASM} from "dash-platform-sdk";
import {validateHex} from "../../../../utils";

export class ImportIdentityHandler implements MessageBackendHandler {
    identitiesRepository: IdentitiesRepository
    dpp: DashPlatformProtocolWASM

    constructor(identitiesRepository: IdentitiesRepository, dpp: DashPlatformProtocolWASM) {
        this.identitiesRepository = identitiesRepository
        this.dpp = dpp
    }

    async handle(event: EventData): Promise<ImportIdentityResponse> {
        const payload: ImportIdentityPayload = event.payload

        const identity = await this.identitiesRepository.getByIdentifier(payload.identifier)

        if (identity) {
            throw new Error('Identity already exists')
        }

        // todo check private key belongs to this identity

        await this.identitiesRepository.create(payload.identifier, payload.privateKeys)

        return {}
    }

    validatePayload(payload: ImportIdentityPayload): string | null {
        try {
            new this.dpp.IdentifierWASM(payload.identifier)
        } catch (e) {
            return 'Could not decode identity identifier'
        }

        if (!payload?.privateKeys?.length) {
            return 'Private keys are missing'
        }

        if (!payload.privateKeys.every(privateKey => typeof privateKey === 'string' && validateHex(privateKey))) {
            return 'Private keys should be in hex format'
        }

        return null
    }
}
