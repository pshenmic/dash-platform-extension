import {EventData} from "../../../../types/EventData";
import {APIHandler} from "../../APIHandler";
import {DashPlatformProtocolWASM} from "pshenmic-dpp";
import {CreateWalletPayload} from "../../../../types/messages/payloads/CreateWalletPayload";
import {WalletRepository} from "../../../repository/WalletRepository";
import {WalletType} from "../../../../types/WalletType";
import { PublicKey, PrivateKey } from "eciesjs";

import hash from "hash.js";
import {CreateWalletResponse} from "../../../../types/messages/response/CreateWalletResponse";

export class CreateWalletHandler implements APIHandler {
    walletRepository: WalletRepository
    dpp: DashPlatformProtocolWASM

    constructor(walletRepository: WalletRepository, dpp: DashPlatformProtocolWASM) {
        this.walletRepository = walletRepository
        this.dpp = dpp
    }

    async handle(event: EventData): Promise<CreateWalletResponse> {
        const payload: CreateWalletPayload = event.payload

        const walletType = WalletType[payload.walletType]

        const passwordHash = hash.sha256().update(payload.password).digest('hex')
        const password = PrivateKey.fromHex(passwordHash)

        await this.walletRepository.create(walletType, password.publicKey)

        return {}
    }

    validatePayload(payload: CreateWalletPayload): string | null {
        if(!WalletType[payload.walletType]) {
            return `Invalid wallet type: ${payload.walletType}`
        }

        // todo validate password

        return null
    }
}
