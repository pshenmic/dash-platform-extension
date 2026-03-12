import { StateTransitionStatus } from '../../types/enums/StateTransitionStatus'
import { StorageAdapter } from '../storage/storageAdapter'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { base64 } from '@scure/base'
import { StateTransitionsStoreSchema, StateTransitionStoreSchema } from '../storage/storageSchema'
import { StateTransition } from '../../types'
import { bytesToHex } from '../../utils'

export class StateTransitionsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (stateTransitionWASM: StateTransitionWASM): Promise<StateTransition> {
    if (stateTransitionWASM.signature != null && stateTransitionWASM.signature.length !== 0) {
      throw new Error('State transition already signed')
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const unsignedHash = stateTransitionWASM.hash(true)
    const unsigned = base64.encode(stateTransitionWASM.bytes())

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[unsignedHash] != null) {
      throw new Error(`State transition with hash ${unsignedHash} already exists`)
    }

    const stateTransition: StateTransitionStoreSchema = {
      unsignedHash,
      signedHash: null,
      unsigned,
      status: StateTransitionStatus.pending,
      signature: null,
      signaturePublicKeyId: null,
      error: null
    }

    stateTransitions[unsignedHash] = stateTransition

    await this.storageAdapter.set(storageKey, stateTransitions)

    return {
      ...stateTransition,
      status: StateTransitionStatus[stateTransition.status]
    }
  }

  async getByHash (hash: string): Promise<StateTransition | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

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

  async update (stateTransitionWASM: StateTransitionWASM, status: StateTransitionStatus, error?: string): Promise<StateTransition> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    const unsignedHash = stateTransitionWASM.hash(true)

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[unsignedHash] == null) {
      throw new Error(`State transition with hash ${unsignedHash} does not exist`)
    }

    const stateTransition: StateTransitionStoreSchema = stateTransitions[unsignedHash]

    if (status === StateTransitionStatus.approved) {
      const { signature, signaturePublicKeyId } = stateTransitionWASM

      if (signature == null || signaturePublicKeyId == null) {
        throw new Error('Signature is not available after approval')
      }

      stateTransition.signedHash = stateTransitionWASM.hash(false)
      stateTransition.signature = bytesToHex(signature)
      stateTransition.signaturePublicKeyId = signaturePublicKeyId
    }

    stateTransition.status = status
    stateTransition.error = error ?? null

    stateTransitions[unsignedHash] = stateTransition

    await this.storageAdapter.set(storageKey, stateTransitions)

    return {
      ...stateTransition,
      status: StateTransitionStatus[stateTransition.status]
    }
  }
}
