import {EventData} from "../../../../types/EventData";
import {APIHandler} from "../../APIHandler";
import {StorageAdapter} from "../../../storage/storageAdapter";
import {SetupPasswordResponse} from "../../../../types/messages/response/SetupPasswordResponse";
import {SetupPasswordPayload} from "../../../../types/messages/payloads/SetupPasswordPayload";
import hash from "hash.js";
import { PrivateKey } from "eciesjs";

export class SetupPasswordHandler implements APIHandler {
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter
    }

    async handle(event: EventData): Promise<SetupPasswordResponse> {
        const payload: SetupPasswordPayload = event.payload

        const isSet = await this.storageAdapter.get('passwordPublicKey')

        if (isSet) {
            throw new Error('Password already set')
        }

        const passwordHash = hash.sha256().update(payload.password).digest('hex')
        const secretKey = PrivateKey.fromHex(passwordHash);

        await this.storageAdapter.set('passwordPublicKey', secretKey.publicKey.toHex())

        return {}
    }

    validatePayload(payload: SetupPasswordPayload): string | null {
        if (!payload.password) {
            return 'Password must be included in the payload'
        }

        return null
    }
}
