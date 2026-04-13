import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, PrivateKeyWASM, Purpose, SecurityLevel } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { OneTimeAddressesRepository } from '../../../repository/OneTimeAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { RegisterIdentityPayload } from '../../../../types/messages/payloads/RegisterIdentityPayload'
import { RegisterIdentityResponse } from '../../../../types/messages/response/RegisterIdentityResponse'
import { IdentityType } from '../../../../types/enums/IdentityType'
import {
  decryptOneTimePrivateKey,
  buildAssetLockFromPaymentTx,
  waitForAssetLockChainLock
} from '../../../services/identityRegistration'

export class RegisterIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  keypairRepository: KeypairRepository
  oneTimeAddressesRepository: OneTimeAddressesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    keypairRepository: KeypairRepository,
    oneTimeAddressesRepository: OneTimeAddressesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.oneTimeAddressesRepository = oneTimeAddressesRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<RegisterIdentityResponse> {
    const payload: RegisterIdentityPayload = event.payload

    // ── 1. Validate wallet and network context ──────────────────────────────
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is set. Please create or switch to a wallet before registering an identity.')
    }

    const network = await this.storageAdapter.get('network') as string

    if (network == null) {
      throw new Error('Network is not configured')
    }

    // ── 2. Load the one-time address entry and decrypt the private key ───────
    const oneTimeAddressEntry = await this.oneTimeAddressesRepository.getByAddress(payload.paymentAddress)

    if (oneTimeAddressEntry == null) {
      throw new Error(
        `One-time address ${payload.paymentAddress} not found. ` +
        'It may belong to a different wallet or network.'
      )
    }

    const oneTimePrivateKeyWASM: PrivateKeyWASM = decryptOneTimePrivateKey(
      oneTimeAddressEntry.encryptedPrivateKey,
      payload.password,
      network
    )

    const oneTimePrivateKeyWif: string = oneTimePrivateKeyWASM.WIF()

    // ── 3. Build asset lock transaction from the payment tx ──────────────────
    const { assetLockTx, assetLockOutputIndex } = await buildAssetLockFromPaymentTx({
      coreSDK: this.coreSDK,
      paymentTxid: payload.paymentTxid,
      oneTimeAddress: payload.paymentAddress,
      oneTimePrivateKeyWif,
      outputIndex: payload.outputIndex
    })

    // ── 4. Broadcast the asset lock transaction ──────────────────────────────
    const broadcastResult = await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
    const assetLockTxid = assetLockTx.hash()

    console.log('[registerIdentity] Asset lock broadcast result:', broadcastResult)
    console.log('[registerIdentity] Asset lock txid:', assetLockTxid)

    // ── 5. Wait for chain lock ───────────────────────────────────────────────
    const { coreChainLockedHeight } = await waitForAssetLockChainLock(this.coreSDK, assetLockTxid)

    console.log('[registerIdentity] Chain lock height:', coreChainLockedHeight)

    // ── 6. Build the master identity key pair ────────────────────────────────
    const identityPrivateKey = PrivateKeyWASM.fromHex(
      // Generate a random key for the identity master key (keystore wallet model).
      // For seedphrase wallets this would be derived — here we generate a random key
      // and save it encrypted; users can re-derive later via the export flow.
      generateSecureHex(32),
      network
    )

    const identityPublicKeyInCreation = {
      id: 0,
      purpose: Purpose.AUTHENTICATION,
      securityLevel: SecurityLevel.MASTER,
      keyType: KeyType.ECDSA_SECP256K1,
      readOnly: false,
      data: identityPrivateKey.getPublicKey().bytes(),
      signature: undefined as Uint8Array | undefined
    }

    // ── 7. Sign the public key in creation ───────────────────────────────────
    // Per dash-platform-sdk protocol: create a temporary transition, sign with the
    // identity key to get its "proof of possession" signature, store it on the key.
    const chainLockProof = {
      txid: assetLockTxid,
      outputIndex: assetLockOutputIndex,
      coreChainLockedHeight,
      type: 'chainLock' as const
    }

    let stateTransition = this.sdk.identities.createStateTransition('create', {
      publicKeys: [identityPublicKeyInCreation],
      assetLockProof: chainLockProof
    })

    stateTransition.signByPrivateKey(identityPrivateKey, undefined, KeyType.ECDSA_SECP256K1)
    identityPublicKeyInCreation.signature = stateTransition.signature

    // ── 8. Finalize: re-create with signed keys, sign with asset lock key ────
    stateTransition = this.sdk.identities.createStateTransition('create', {
      publicKeys: [identityPublicKeyInCreation],
      assetLockProof: chainLockProof
    })

    stateTransition.signByPrivateKey(oneTimePrivateKeyWASM, undefined, KeyType.ECDSA_SECP256K1)

    // ── 9. Derive the new identity identifier ────────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    // hash(skip_signature: boolean): string — returns a hex string directly
    const stateTransitionHash: string = stateTransition.hash(false)

    console.log('[registerIdentity] Identity identifier:', identifier)

    // ── 10. Broadcast the state transition ───────────────────────────────────
    await this.sdk.stateTransitions.broadcast(stateTransition)

    // ── 11. Wait for confirmation ────────────────────────────────────────────
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // ── 12. Persist identity and keys ────────────────────────────────────────
    await this.identitiesRepository.create(identifier, IdentityType.regular)

    // Save the identity master key (keyId 0) using addVerified to skip remote validation.
    // The identity is confirmed on-chain at this point, but we generated the key
    // randomly so we save it directly without another round-trip.
    await this.keypairRepository.addVerified(identifier, identityPrivateKey.hex(), 0)

    // ── 13. Switch to the new identity ───────────────────────────────────────
    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
      assetLockTxid,
      stateTransitionHash
    }
  }

  validatePayload (payload: RegisterIdentityPayload): string | null {
    if (typeof payload.paymentAddress !== 'string' || payload.paymentAddress.length === 0) {
      return 'paymentAddress must be provided'
    }

    if (typeof payload.paymentTxid !== 'string' || payload.paymentTxid.length !== 64) {
      return 'paymentTxid must be a 64-character hex string'
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    if (payload.outputIndex != null && (!Number.isSafeInteger(payload.outputIndex) || payload.outputIndex < 0)) {
      return 'outputIndex must be a non-negative integer'
    }

    return null
  }
}

/** Generates cryptographically random hex of the given byte length. */
function generateSecureHex (byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
