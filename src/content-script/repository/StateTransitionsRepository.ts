import { StateTransitionStatus } from '../../types/enums/StateTransitionStatus'
import type { StorageAdapter } from '../storage/storageAdapter'
import type { StateTransitionWASM } from 'dash-platform-sdk/types'
import { base64 } from '@scure/base'
import type { StateTransitionsStoreSchema, StateTransitionStoreSchema } from '../storage/storageSchema'
import {
  MAX_STATE_TRANSITION_SIZE_BASE64,
  MAX_STATE_TRANSITIONS_SIZE_BASE64,
  MAX_STORED_STATE_TRANSITIONS,
  STATE_TRANSITION_PENDING_TTL_MS,
  STATE_TRANSITION_RESOLVED_TTL_MS
} from '../../constants'
import type { StateTransition } from '../../types'
import { bytesToHex } from '../../utils/browser'

// Records a page queued and never resolved are the leak: a popup closed with
// the X leaves the row pending forever. The page stops polling after
// MESSAGING_TIMEOUT, so an old pending row is dead weight, not a decision in
// progress. Resolved rows live longer so the page can still read the outcome.
const isExpired = (stateTransition: StateTransitionStoreSchema, now: number): boolean => {
  const resolvedAt = stateTransition.resolvedAt ?? null
  const since = resolvedAt ?? stateTransition.createdAt ?? 0
  const ttl = resolvedAt == null ? STATE_TRANSITION_PENDING_TTL_MS : STATE_TRANSITION_RESOLVED_TTL_MS

  return now - since > ttl
}

// Records written before `signed` existed carry no such field, and the public
// layer hands the whole row to the page, so normalize on the way out.
const toStateTransition = (stateTransition: StateTransitionStoreSchema): StateTransition => ({
  ...stateTransition,
  status: StateTransitionStatus[stateTransition.status],
  signed: stateTransition.signed ?? null,
  origin: stateTransition.origin ?? null
})

export class StateTransitionsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async create (stateTransitionWASM: StateTransitionWASM): Promise<StateTransition> {
    if (stateTransitionWASM.signature != null && stateTransitionWASM.signature.length !== 0) {
      throw new Error('State transition already signed')
    }

    return await this.createFromEncoded(base64.encode(stateTransitionWASM.bytes()), stateTransitionWASM.hash(true))
  }

  /**
   * Stores a transition the caller already has as base64 plus its unsigned
   * hash. This is the SDK-free entry point: the public layer decodes through
   * the backend and then writes here without ever loading the SDK itself.
   *
   * The caller is responsible for rejecting a transition that already carries
   * a signature — that needs the decoded form, which this layer does not have.
   */
  async createFromEncoded (unsigned: string, unsignedHash: string, origin: string | null = null): Promise<StateTransition> {
    // hash(true) is always 64 hex characters. Checking it here keeps a future
    // caller from writing a record under a page-chosen key.
    if (!/^[0-9a-fA-F]{64}$/.test(unsignedHash)) {
      throw new Error('State transition hash is not valid')
    }

    if (unsigned.length > MAX_STATE_TRANSITION_SIZE_BASE64) {
      throw new Error(`State transition is too large: ${unsigned.length} base64 characters, maximum ${MAX_STATE_TRANSITION_SIZE_BASE64}`)
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[unsignedHash] != null) {
      throw new Error(`State transition with hash ${unsignedHash} already exists`)
    }

    const now = Date.now()

    const kept: StateTransitionsStoreSchema = {}

    for (const [hash, stateTransition] of Object.entries(stateTransitions)) {
      if (!isExpired(stateTransition, now)) {
        kept[hash] = stateTransition
      }
    }

    // An approved record keeps the signed copy as well, so both count against
    // the budget - otherwise the store can hold roughly twice what it promises.
    const storedSize = Object.values(kept)
      .reduce((sum, stateTransition) => sum + stateTransition.unsigned.length + (stateTransition.signed?.length ?? 0), 0)

    if (Object.keys(kept).length >= MAX_STORED_STATE_TRANSITIONS ||
      storedSize + unsigned.length > MAX_STATE_TRANSITIONS_SIZE_BASE64) {
      throw new Error('Too many state transitions are waiting for approval. Approve or reject them first.')
    }

    const stateTransition: StateTransitionStoreSchema = {
      unsignedHash,
      signedHash: null,
      unsigned,
      signed: null,
      status: StateTransitionStatus.pending,
      signature: null,
      signaturePublicKeyId: null,
      error: null,
      origin,
      createdAt: now,
      resolvedAt: null
    }

    kept[unsignedHash] = stateTransition

    await this.storageAdapter.set(storageKey, kept)

    return toStateTransition(stateTransition)
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

    return toStateTransition(stateTransition)
  }

  /**
   * Records the user's decision on a transition.
   *
   * Keyed by the hash the record was created under rather than by a hash
   * recomputed from the transition. Recomputing ties the store to the caller
   * handing back exactly the transition it was given, and rejecting does not
   * need the transition at all.
   */
  async resolve (unsignedHash: string, status: StateTransitionStatus, error?: string): Promise<StateTransition> {
    return await this.write(unsignedHash, (stateTransition) => {
      stateTransition.status = status
      stateTransition.error = error ?? null
    })
  }

  /**
   * Records an approval together with what was actually signed.
   *
   * The signed copy is stored, not just the signature, so that the caller can
   * be handed what went to the network without rebuilding it from the
   * unsigned bytes and the signature.
   */
  async approve (unsignedHash: string, stateTransitionWASM: StateTransitionWASM): Promise<StateTransition> {
    const { signature, signaturePublicKeyId } = stateTransitionWASM

    // An unsigned transition carries an empty signature rather than none at
    // all, and key id 0 is a real key, so the length is what tells them apart.
    if (signature == null || signature.length === 0 || signaturePublicKeyId == null) {
      throw new Error('Signature is not available after approval')
    }

    const signed = base64.encode(stateTransitionWASM.bytes())

    if (signed.length > MAX_STATE_TRANSITION_SIZE_BASE64) {
      throw new Error(`Signed state transition is too large: ${signed.length} base64 characters, maximum ${MAX_STATE_TRANSITION_SIZE_BASE64}`)
    }

    return await this.write(unsignedHash, (stateTransition) => {
      stateTransition.signedHash = stateTransitionWASM.hash(false)
      stateTransition.signed = signed
      stateTransition.signature = bytesToHex(signature)
      stateTransition.signaturePublicKeyId = signaturePublicKeyId
      stateTransition.status = StateTransitionStatus.approved
      stateTransition.error = null
    })
  }

  private async write (unsignedHash: string, mutate: (stateTransition: StateTransitionStoreSchema) => void): Promise<StateTransition> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `stateTransitions_${network}_${walletId}`

    const stateTransitions = (await this.storageAdapter.get(storageKey) ?? {}) as StateTransitionsStoreSchema

    if (stateTransitions[unsignedHash] == null) {
      throw new Error(`State transition with hash ${unsignedHash} does not exist`)
    }

    const stateTransition: StateTransitionStoreSchema = stateTransitions[unsignedHash]

    mutate(stateTransition)

    // Retention counts from the decision, not from when the page queued it.
    stateTransition.resolvedAt = stateTransition.status === StateTransitionStatus.pending ? null : Date.now()

    stateTransitions[unsignedHash] = stateTransition

    await this.storageAdapter.set(storageKey, stateTransitions)

    return toStateTransition(stateTransition)
  }
}
