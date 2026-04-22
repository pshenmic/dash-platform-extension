import { DashCoreSDK } from 'dash-core-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { OneTimeAddressesRepository } from '../../../repository/OneTimeAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { RegisterIdentityPayload } from '../../../../types/messages/payloads/RegisterIdentityPayload'
import { RegisterIdentityResponse } from '../../../../types/messages/response/RegisterIdentityResponse'
import { IdentityType } from '../../../../types/enums/IdentityType'
import {
  buildAssetLockFromPaymentTx,
  waitForAssetLockProof,
  buildIdentityCreateTransition,
  IDENTITY_KEY_DEFINITIONS
} from '../../../services/identityRegistration'
import {
  deriveSeedphrasePrivateKey,
  deriveFundingPrivateKey,
  hexToBytes
} from '../../../../utils'
import { WalletType } from '../../../../types/WalletType'
import { TXID_HEX_LENGTH } from '../../../../constants'

export class RegisterIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  oneTimeAddressesRepository: OneTimeAddressesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    oneTimeAddressesRepository: OneTimeAddressesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
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

    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Identity registration is only supported for seedphrase wallets')
    }

    if (oneTimeIdentityIndex == null) {
      throw new Error(
        `One-time address ${payload.paymentAddress} has no identityIndex. ` +
        'Seedphrase wallet registration requires a deterministic one-time address tied to an identity index.'
      )
    }

    const identityIndex = oneTimeIdentityIndex

    const oneTimePrivateKeyWASM: PrivateKeyWASM = await deriveFundingPrivateKey(
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

    // ── 6. Derive all identity key pairs ─────────────────────────────────────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveSeedphrasePrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 7-8. Build and sign identity create state transition ─────────────────
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      oneTimePrivateKeyWASM,
      assetLockProof,
      this.sdk
    )

    // ── 9. Derive the new identity identifier ────────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    // ── 10. Broadcast the state transition ──────────────────────────────────
    await this.sdk.stateTransitions.broadcast(stateTransition)

    // hash(skip_signature: boolean): string — computed after successful broadcast
    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 11. Wait for confirmation ────────────────────────────────────────────
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // ── 12. Persist identity ─────────────────────────────────────────────────
    await this.identitiesRepository.create(identifier, IdentityType.regular, undefined, identityIndex)

    await this.oneTimeAddressesRepository.removeByAddress(payload.paymentAddress)

    // ── 13. Switch to the new identity ───────────────────────────────────────
    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
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

