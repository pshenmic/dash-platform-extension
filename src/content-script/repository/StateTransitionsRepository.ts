import hash from "hash.js";
import {StateTransitionStatus} from "../../types/enums/StateTransitionStatus";
import {StateTransition} from "../../types/StateTransition";
import {StorageAdapter} from "../storage/storageAdapter";

export class StateTransitionsRepository {
    walletId: string
    network: string
    storageKey: string
    storageAdapter: StorageAdapter

    constructor(walletId: string, network: string, storageAdapter: StorageAdapter) {
        this.walletId = walletId
        this.network = network
        this.storageKey = `${network}_${walletId}_stateTransitions`
        this.storageAdapter = storageAdapter
    }

    async create(base64: string): Promise<StateTransition> {
        const txHash = hash.sha256().update(base64).digest('hex')

        const stateTransition: StateTransition = {
            unsigned: base64,
            hash: txHash,
            status: StateTransitionStatus.pending,
            signature: null,
            signaturePublicKeyId: null
        }

        const stateTransitions = await this.storageAdapter.get(this.storageKey)

        if (stateTransitions[stateTransition.hash]) {
            throw new Error(`State Transition with tx hash ${txHash} already exists`)
        }

        stateTransitions[txHash] = stateTransition

        await this.storageAdapter.set(this.storageKey, stateTransitions)

        return stateTransition
    }

    async get(hash: string) {
        const stateTransitions = await this.storageAdapter.get(this.storageKey)

        if (!stateTransitions[hash]) {
            throw new Error(`State transition with hash ${hash} does not exist`)
        }

        return stateTransitions[hash]
    }

    async markApproved(hash: string, signature: string, signaturePublicKeyId: number): Promise<StateTransition> {
        const stateTransitions = await this.storageAdapter.get(this.storageKey)

        if (!stateTransitions[hash]) {
            throw new Error(`AppConnect with request ${hash} does not exist`)
        }

        const stateTransition = stateTransitions[hash]

        stateTransition.signature = signature
        stateTransition.signaturePublicKeyId = signaturePublicKeyId
        stateTransition.status = StateTransitionStatus.approved

        stateTransitions[hash] = stateTransition

        await this.storageAdapter.set(this.storageKey, stateTransitions)

        return stateTransition
    }

    async markRejected(hash: string): Promise<StateTransition> {
        const stateTransitions = await this.storageAdapter.get(this.storageKey)

        if (!stateTransitions[hash]) {
            throw new Error(`State transition with hash ${hash} does not exist`)
        }

        const stateTransition = stateTransitions[hash]

        stateTransition.status = StateTransitionStatus.rejected

        stateTransitions[hash] = stateTransition

        await this.storageAdapter.set(this.storageKey, stateTransitions)

        return stateTransition
    }

}
