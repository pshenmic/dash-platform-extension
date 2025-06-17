import {StateTransitionStatus} from "../../types/enums/StateTransitionStatus";
import {StateTransition} from "../../types/StateTransition";
import {StorageAdapter} from "../storage/storageAdapter";
import {DashPlatformProtocolWASM, StateTransitionWASM} from 'pshenmic-dpp'
import {base64} from "@scure/base";
import {StateTransitionStoreSchema} from "../storage/storageSchema";
export class StateTransitionsRepository {
    dpp: DashPlatformProtocolWASM
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM) {
        this.dpp = dpp
        this.storageAdapter = storageAdapter
    }

    async create(stateTransitionWASM: StateTransitionWASM): Promise<StateTransition> {
        const network = await this.storageAdapter.get('network') as string
        const walletId = await this.storageAdapter.get('currentWalletId') as string
        const hash = stateTransitionWASM.hash(true)
        const unsigned = base64.encode(stateTransitionWASM.toBytes())

        const storageKey = `stateTransitions_${network}_${walletId}`

        const stateTransitions = await this.storageAdapter.get(storageKey)

        if (stateTransitions[hash]) {
            throw new Error(`State Transition with tx hash ${hash} already exists`)
        }

        const stateTransition = {
            unsigned,
            hash,
            status: StateTransitionStatus.pending,
            signature: null,
            signaturePublicKeyId: null
        }

        stateTransitions[hash] = stateTransition as StateTransitionStoreSchema

        await this.storageAdapter.set(storageKey, stateTransitions)

        return stateTransition
    }

    async get(hash: string) {
        const stateTransitions = await this.storageAdapter.get(this.storageKey)

        if (!stateTransitions[hash]) {
            throw new Error(`State transition with hash ${hash} does not exist`)
        }

        return stateTransitions[hash]
    }

    async update(hash: string, status: StateTransitionStatus, signature?: string, signaturePublicKeyId?: number): Promise<StateTransition> {
        const network = await this.storageAdapter.get('network') as string
        const walletId = await this.storageAdapter.get('currentWalletId') as string

        const storageKey = `stateTransitions_${network}_${walletId}`

        const stateTransitions = await this.storageAdapter.get(storageKey)

        if (!stateTransitions[hash]) {
            throw new Error(`State transition with hash ${hash} does not exist`)
        }

        const stateTransition = stateTransitions[hash]

        if (status === StateTransitionStatus.approved) {
            stateTransition.signature = signature
            stateTransition.signaturePublicKeyId = signaturePublicKeyId
        }

        stateTransition.status = status

        stateTransitions[hash] = stateTransition

        await this.storageAdapter.set(storageKey, stateTransitions)

        return stateTransition
    }
}
