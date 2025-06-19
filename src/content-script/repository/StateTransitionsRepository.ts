import { StateTransitionStatus } from '../../types/enums/StateTransitionStatus'
import { StateTransition } from '../../types/StateTransition'
import { StorageAdapter } from '../storage/storageAdapter'
import { DashPlatformProtocolWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { base64 } from '@scure/base'
import { StateTransitionsStoreSchema, StateTransitionStoreSchema } from '../storage/storageSchema'

export class StateTransitionsRepository {
  dpp: DashPlatformProtocolWASM
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM) {
    this.dpp = dpp
    this.storageAdapter = storageAdapter
  }

  async create (stateTransitionWASM: StateTransitionWASM): Promise<StateTransition> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const hash = stateTransitionWASM.hash(true)
    const unsigned = base64.encode(stateTransitionWASM.toBytes())

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[hash] != null) {
      throw new Error(`State transition with hash ${hash} already exists`)
    }

    const stateTransition: StateTransitionStoreSchema = {
      unsigned,
      hash,
      status: StateTransitionStatus.pending,
      signature: null,
      signaturePublicKeyId: null
    }

    stateTransitions[hash] = stateTransition

    await this.storageAdapter.set(storageKey, stateTransitions)

    return {
      ...stateTransition,
      status: StateTransitionStatus[stateTransition.status]
    }
  }

  async getByHash (hash: string): Promise<StateTransition | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    const stateTransition: StateTransitionStoreSchema = stateTransitions[hash]

    if (stateTransition == null) {
      return null
    }

    return {
      ...stateTransition,
      status: StateTransitionStatus[stateTransition.status]
    }
  }

  async update (hash: string, status: StateTransitionStatus, signature?: string, signaturePublicKeyId?: number): Promise<StateTransition> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[hash] == null) {
      throw new Error(`State transition with hash ${hash} does not exist`)
    }

    const stateTransition: StateTransitionStoreSchema = stateTransitions[hash]

    if (status === StateTransitionStatus.approved) {
      if (signature == null || signaturePublicKeyId == null) {
        throw new Error('Signature and signaturePublicKeyId must be provided')
      }

      stateTransition.signature = signature
      stateTransition.signaturePublicKeyId = signaturePublicKeyId
    }

    stateTransition.status = status

    stateTransitions[hash] = stateTransition

    await this.storageAdapter.set(storageKey, stateTransitions)

    return {
      ...stateTransition,
      status: StateTransitionStatus[stateTransition.status]
    }
  }
}
