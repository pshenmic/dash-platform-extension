import { DashPlatformSDK } from 'dash-platform-sdk'
import { StateTransitionWASM, IdentityUpdateTransitionWASM } from 'dash-platform-sdk/types'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { ApproveStateTransitionResponse } from '../../../../types/messages/response/ApproveStateTransitionResponse'
import { ApproveStateTransitionPayload } from '../../../../types/messages/payloads/ApproveStateTransitionPayload'
import { deriveKeystorePrivateKey, deriveIdentityPrivateKey, validateHex, validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StateTransitionStatus } from '../../../../types/enums/StateTransitionStatus'
import { Wallet, Identity, WalletType, EventData } from '../../../../types'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { BroadcastError } from '../../../errors/BroadcastError'
import { SigningError } from '../../../errors/SigningError'

export class ApproveStateTransitionHandler implements APIHandler {
  keyPairRepository: KeypairRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (stateTransitionsRepository: StateTransitionsRepository,
    identitiesRepository: IdentitiesRepository,
    walletRepository: WalletRepository,
    keyPairRepository: KeypairRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK
  ) {
    this.keyPairRepository = keyPairRepository
    this.stateTransitionsRepository = stateTransitionsRepository
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async sign (stateTransitionBase64: string, wallet: Wallet, identity: Identity, keyId: number, password: string): Promise<StateTransitionWASM> {
    const stateTransitionWASM = StateTransitionWASM.fromBase64(stateTransitionBase64)

    const ownerId = stateTransitionWASM.getOwnerId()

    if (ownerId == null) {
      throw new Error('Owner ID is missing from state transition')
    }

    // A transition is signed as its own owner. Signing it as somebody else
    // would mean rewriting the owner and the nonces, which makes a different
    // transition out of the one the caller submitted - the caller builds a new
    // one for the identity it wants instead.
    if (ownerId.base58() !== identity.identifier) {
      throw new Error(`State transition is owned by ${ownerId.base58()} and cannot be signed as ${identity.identifier}`)
    }

    let privateKeyWASM

    if (wallet.type === WalletType.keystore) {
      privateKeyWASM = await deriveKeystorePrivateKey(wallet, password, identity.identifier, keyId, this.keyPairRepository)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKeyWASM = await deriveIdentityPrivateKey(wallet, password, identity.index, keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(identity.identifier)

    const [identityPublicKey] = identityWASM.getPublicKeys().filter(identityPublicKey => identityPublicKey.keyId === keyId)

    if (identityPublicKey == null) {
      throw new Error(`Could not find Identity Public Key with Key ID ${keyId} in Identity ${identity.identifier}`)
    }

    // A disabled key still signs, and the signature still looks well formed -
    // Platform is the one that rejects it, after the transition has spent its
    // nonce. The wallet's own screens filter these out before offering a key,
    // but a website asking the signer to approve a transition names the key id
    // itself, so the check belongs here too.
    if (identityPublicKey.disabledAt != null) {
      throw new Error(`Identity Public Key with Key ID ${keyId} is disabled and cannot sign`)
    }

    // The key the caller named has to be the one this wallet derives for it.
    // Signing with a mismatched key produces a well formed signature that
    // Platform refuses, and the nonce is spent either way. Compared by public
    // key hash, which both sides expose as the same hex string.
    if (privateKeyWASM.getPublicKey().getPublicKeyHash() !== identityPublicKey.getPublicKeyHash()) {
      throw new Error(`Identity Public Key with Key ID ${keyId} does not match the key this wallet derives for it`)
    }

    stateTransitionWASM.sign(privateKeyWASM, identityPublicKey)

    return stateTransitionWASM
  }

  async handle (event: EventData): Promise<ApproveStateTransitionResponse> {
    const payload: ApproveStateTransitionPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    const stateTransition = await this.stateTransitionsRepository.getByHash(payload.hash)

    if (stateTransition == null) {
      throw new Error(`Could not find state transition with hash ${payload.hash} for signing`)
    }

    let stateTransitionWASM

    try {
      stateTransitionWASM = await this.sign(stateTransition.unsigned, wallet, identity, payload.keyId, payload.password)
    } catch (e) {
      throw new SigningError(e.message ?? e)
    }

    const ownerId = stateTransitionWASM.getOwnerId()

    if (ownerId == null) {
      throw new Error('Owner ID is missing from state transition during sign')
    }

    const signature = stateTransitionWASM.signature
    const signedHex = stateTransitionWASM.hex()

    if (signature == null) {
      throw new Error('Signature is missing after signing')
    }

    try {
      await this.sdk.stateTransitions.broadcast(stateTransitionWASM)
      await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransitionWASM)

      await this.stateTransitionsRepository.approve(payload.hash, stateTransitionWASM)

      // Check for pending keys (from keystore wallet key creation) and save them
      const actionType = stateTransitionWASM.getActionType()

      if (wallet.type === WalletType.keystore && actionType === 'IDENTITY_UPDATE') {
        const { publicKeyIdsToAdd } = IdentityUpdateTransitionWASM.fromStateTransition(stateTransitionWASM)
        const keyPairs = await this.keyPairRepository.getAllByIdentity(ownerId.base58(), true)
        const matchedKeyPairs = keyPairs
          .filter((keyPair) => publicKeyIdsToAdd.some(publicKeyIdToAdd => publicKeyIdToAdd.keyId === keyPair.keyId))

        for (const keyPair of matchedKeyPairs) {
          await this.keyPairRepository.unmarkPending(ownerId.base58(), keyPair.keyId)
        }
      }
    } catch (e) {
      console.log('Failed to broadcast transaction', e)
      await this.stateTransitionsRepository.resolve(payload.hash, StateTransitionStatus.error, e.message)

      throw new BroadcastError(e.message ?? e, signedHex)
    }

    return {
      txHash: stateTransitionWASM.hash(false)
    }
  }

  validatePayload (payload: ApproveStateTransitionPayload): null | string {
    if (!validateHex(payload.hash)) {
      return 'State transition hash is not valid'
    }

    if (!validateIdentifier(payload.identity)) {
      return 'Identity identifier is not valid'
    }

    if (payload.password == null) {
      return 'Password is missing'
    }

    if (payload.keyId == null) {
      return 'Key ID is missing'
    }

    return null
  }
}
