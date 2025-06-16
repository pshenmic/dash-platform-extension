import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {EventData} from "../../../../types/EventData";
import {CreateIdentityPayload} from "../../../../types/messages/payloads/CreateIdentityPayload";
import {APIHandler} from "../../APIHandler";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {CreateIdentityResponse} from "../../../../types/messages/response/CreateIdentityResponse";
import {WalletRepository} from "../../../repository/WalletRepository";
import {WalletType} from "../../../../types/WalletType";
import {base64} from "@scure/base";
import {KeypairRepository} from "../../../repository/KeypairRepository";
import {validateHex, } from "../../../../utils";

export class CreateIdentityHandler implements APIHandler {
    keypairRepository: KeypairRepository
    identitiesRepository: IdentitiesRepository
    walletRepository: WalletRepository
    dpp: DashPlatformProtocolWASM

    constructor(identitiesRepository: IdentitiesRepository, keypairRepository: KeypairRepository, dpp: DashPlatformProtocolWASM) {
        this.identitiesRepository = identitiesRepository
        this.keypairRepository = keypairRepository
        this.dpp = dpp
    }

    async handle(event: EventData): Promise<CreateIdentityResponse> {
        const payload: CreateIdentityPayload = event.payload
        const wallet = await this.walletRepository.get()

        // store identity public keys
        const identity = await this.identitiesRepository.getByIdentifier(payload.identifier)

        if (identity) {
            throw new Error(`Identity with identifier ${payload.identifier} already exists`)
        }

        const identityPublicKeysWASM = payload.identityPublicKeys.map(identityPublicKey => this.dpp.IdentityPublicKeyWASM.fromBytes(base64.decode(identityPublicKey)))

        if (wallet.type === WalletType.keystore) {
            // check if all private keys belongs to identity public keys
            if (!payload.privateKeys
                .every(privateKey => identityPublicKeysWASM
                    .some(identityPublicKey => identityPublicKey.getPublicKeyHash() ===
                        this.dpp.PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash()))) {
                throw new Error(`Private key does not belong to any of identity's public keys`)
            }

            for (const privateKey of payload.privateKeys) {
                const [identityPublicKey] = identityPublicKeysWASM
                    .filter((identityPublicKey) => identityPublicKey.getPublicKeyHash() ===
                        this.dpp.PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash())

                await this.keypairRepository.add(payload.identifier, privateKey, identityPublicKey)
            }
        }

        await this.identitiesRepository.create(payload.index, payload.identifier, identityPublicKeysWASM)

        return {}
    }

    validatePayload(payload: CreateIdentityPayload): string | null {
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
