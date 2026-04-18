import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, Network, PrivateKeyWASM, Purpose, SecurityLevel } from 'dash-platform-sdk/types'
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
  waitForAssetLockProof
} from '../../../services/identityRegistration'
import {
  deriveSeedphrasePrivateKey,
  deriveSeedphraseRegistrationFundingPrivateKey,
  getNextIdentityIndex,
  hexToBytes,
  wait
} from '../../../../utils'
import { WalletType } from '../../../../types/WalletType'
import {
  MAX_BROADCAST_RETRIES,
  BROADCAST_RETRY_DELAY_MS,
  TXID_HEX_LENGTH,
  IDENTITY_MASTER_KEY_BYTE_LENGTH
} from '../../../../constants'

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
      throw new Error('No wallet is chosen')
    }

    const network = await this.storageAdapter.get('network') as string

    // ── 2. Load the one-time address entry and decrypt the private key ───────
    const oneTimeAddressEntry = await this.oneTimeAddressesRepository.getByAddress(payload.paymentAddress)

    if (oneTimeAddressEntry == null) {
      throw new Error(
        `One-time address ${payload.paymentAddress} not found. ` +
        'It may belong to a different wallet or network.'
      )
    }

    const oneTimeIdentityIndex = Number.isSafeInteger(oneTimeAddressEntry.identityIndex) &&
      oneTimeAddressEntry.identityIndex >= 0
      ? oneTimeAddressEntry.identityIndex
      : null

    let oneTimePrivateKeyWASM: PrivateKeyWASM
    let identityIndex: number

    if (wallet.type === WalletType.seedphrase) {
      if (oneTimeIdentityIndex == null) {
        throw new Error(
          `One-time address ${payload.paymentAddress} has no identityIndex. ` +
          'Seedphrase wallet registration requires a deterministic one-time address tied to an identity index.'
        )
      }

      identityIndex = oneTimeIdentityIndex

      oneTimePrivateKeyWASM = await deriveSeedphraseRegistrationFundingPrivateKey(
        wallet,
        payload.password,
        identityIndex,
        this.sdk
      )

      const derivedAddress = this.sdk.keyPair.p2pkhAddress(
        oneTimePrivateKeyWASM.getPublicKey().bytes(),
        network as Network
      )

      if (derivedAddress !== payload.paymentAddress) {
        throw new Error(
          `Stored one-time address ${payload.paymentAddress} does not match derived ` +
          `registration funding address for identity index ${identityIndex}`
        )
      }
    } else {
      if (oneTimeAddressEntry.encryptedPrivateKey == null || oneTimeAddressEntry.encryptedPrivateKey === '') {
        throw new Error('Missing encryptedPrivateKey for keystore registration flow')
      }

      identityIndex = oneTimeIdentityIndex ?? getNextIdentityIndex(
        (await this.identitiesRepository.getAll()).map((identity) => identity.index)
      )

      oneTimePrivateKeyWASM = decryptOneTimePrivateKey(
        oneTimeAddressEntry.encryptedPrivateKey,
        payload.password,
        network
      )
    }

    const oneTimePrivateKeyWif: string = oneTimePrivateKeyWASM.WIF()

    // ── 3. Build asset lock transaction from the payment tx ──────────────────
    const { assetLockTx } = await buildAssetLockFromPaymentTx({
      coreSDK: this.coreSDK,
      network,
      paymentTxid: payload.paymentTxid,
      oneTimeAddress: payload.paymentAddress,
      oneTimePrivateKeyWif,
      outputIndex: payload.outputIndex
    })

    // ── 4. Broadcast the asset lock transaction ──────────────────────────────
    // Open the instant lock subscription before broadcasting so we don't miss
    // an instant lock that arrives before the subscription is established.
    const assetLockTxid = assetLockTx.hash()
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.paymentAddress],
      [hexToBytes(assetLockTxid)]
    )

    await this.coreSDK.broadcastTransaction(assetLockTx.bytes())

    // ── 5. Wait for instant lock or chain lock (whichever comes first) ──────
    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      payload.paymentAddress,
      undefined,
      undefined,
      instantLockSub
    )

    // ── 6. Build the master identity key pair ────────────────────────────────
    const identityPrivateKey = wallet.type === WalletType.seedphrase
      ? await deriveSeedphrasePrivateKey(wallet, payload.password, identityIndex, 0, this.sdk)
      : PrivateKeyWASM.fromHex(
        // Generate a random master key for keystore wallets.
        generateSecureHex(IDENTITY_MASTER_KEY_BYTE_LENGTH),
        network
      )

    const identityPublicKeyInCreation = {
      id: 0,
      purpose: Purpose.AUTHENTICATION,
      securityLevel: SecurityLevel.MASTER,
      keyType: KeyType.ECDSA_SECP256K1,
      readOnly: false,
      data: Uint8Array.from(identityPrivateKey.getPublicKey().bytes()),
      signature: undefined as Uint8Array | undefined
    }

    // ── 7. Sign the public key in creation ───────────────────────────────────
    // Per dash-platform-sdk protocol: create a temporary transition, sign with the
    // identity key to get its "proof of possession" signature, store it on the key.
    let stateTransition = this.sdk.identities.createStateTransition('create', {
      publicKeys: [identityPublicKeyInCreation],
      assetLockProof
    })

    stateTransition.signByPrivateKey(identityPrivateKey, undefined, KeyType.ECDSA_SECP256K1)
    // Force-copy out of WASM memory — the step-7 state transition will be GC'd
    // after reassignment in step 8, invalidating any WASM-backed Uint8Array it owns.
    if (stateTransition.signature == null) {
      throw new Error('signByPrivateKey did not produce a signature for the identity key')
    }
    identityPublicKeyInCreation.signature = Uint8Array.from(stateTransition.signature)

    // ── 8. Finalize: re-create with signed keys, sign with asset lock key ────
    stateTransition = this.sdk.identities.createStateTransition('create', {
      publicKeys: [identityPublicKeyInCreation],
      assetLockProof
    })

    stateTransition.signByPrivateKey(oneTimePrivateKeyWASM, undefined, KeyType.ECDSA_SECP256K1)

    // ── 9. Derive the new identity identifier ────────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    // ── 10. Broadcast the state transition (with retry for chain height race) ──
    // Chain lock proofs can arrive 1 block ahead of the platform's consensus height.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.sdk.stateTransitions.broadcast(stateTransition)
        break
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (attempt < MAX_BROADCAST_RETRIES && msg.includes('core chain height')) {
          await wait(BROADCAST_RETRY_DELAY_MS)
        } else {
          throw e
        }
      }
    }

    // hash(skip_signature: boolean): string — computed after successful broadcast
    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 11. Wait for confirmation ────────────────────────────────────────────
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // ── 12. Persist identity and keys ────────────────────────────────────────
    await this.identitiesRepository.create(identifier, IdentityType.regular, undefined, identityIndex)

    // Keystore wallets persist generated private keys in extension storage.
    // Seedphrase wallets derive keys from the mnemonic and don't store key material.
    if (wallet.type === WalletType.keystore) {
      await this.keypairRepository.addVerified(identifier, identityPrivateKey.hex(), 0)
    }

    await this.oneTimeAddressesRepository.removeByAddress(payload.paymentAddress)

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

    if (typeof payload.paymentTxid !== 'string' || payload.paymentTxid.length !== TXID_HEX_LENGTH) {
      return `paymentTxid must be a ${TXID_HEX_LENGTH}-character hex string`
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
