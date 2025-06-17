import {EventData} from "../../../../types/EventData";
import {APIHandler} from "../../APIHandler";
import {GetStatusResponse} from "../../../../types/messages/response/GetStatusResponse";
import {GetStatusPayload} from "../../../../types/messages/payloads/GetStatusPayload";
import {StorageAdapter} from "../../../storage/storageAdapter";

export class GetStatusHandler implements APIHandler {
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter
    }

    async handle(event: EventData): Promise<GetStatusResponse> {
        const payload: GetStatusPayload = event.payload

        const network = await this.storageAdapter.get('network') as string
        const walletId = (await this.storageAdapter.get('currentWalletId') ?? null) as (string | null)

        return { passwordSet: true, network, currentWalletId: walletId}
    }

    validatePayload(payload: GetStatusPayload): string | null {
        return null
    }
}
