import { DashCoreSDK } from 'dash-core-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
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
  fundingAddressesRepository: AssetLockFundingAddressesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    fundingAddressesRepository: AssetLockFundingAddressesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.fundingAddressesRepository = fundingAddressesRepository
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

    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Identity registration is only supported for seedphrase wallets')
    }

    const network = await this.storageAdapter.get('network') as string

    // ── 2. Load the funding address entry ────────────────────────────────────
    const fundingAddressEntry = await this.fundingAddressesRepository.getByAddress(payload.paymentAddress)

    if (fundingAddressEntry == null) {
      throw new Error(
        `Funding address ${payload.paymentAddress} not found. ` +
        'It may belong to a different wallet or network.'
      )
    }

    if (fundingAddressEntry.used) {
      throw new Error(`Funding address ${payload.paymentAddress} has already been used for registration`)
    }

    const identityIndex = fundingAddressEntry.identityIndex

    if (!Number.isSafeInteger(identityIndex) || identityIndex < 0) {
      throw new Error(`Funding address ${payload.paymentAddress} has an invalid identityIndex (${identityIndex})`)
    }

    // ── 3. Derive and verify the funding private key ─────────────────────────
    const fundingPrivateKeyWASM = await deriveFundingPrivateKey(wallet, payload.password, identityIndex, this.sdk)

    const derivedAddress = this.sdk.keyPair.p2pkhAddress(
      fundingPrivateKeyWASM.getPublicKey().bytes(),
      network as Network
    )

    if (derivedAddress !== payload.paymentAddress) {
      throw new Error(
        `Stored funding address ${payload.paymentAddress} does not match derived ` +
        `address for identity index ${identityIndex}`
      )
    }

    // ── 4. Guard: verify the identity index is not already registered on-chain ─
    const authKey = await deriveSeedphrasePrivateKey(wallet, payload.password, identityIndex, 0, this.sdk)
    const pkh = authKey.getPublicKeyHash()
    const existingIdentity =
      await this.sdk.identities.getIdentityByPublicKeyHash(pkh).catch(() => null) ??
      await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh).catch(() => null)

    if (existingIdentity != null) {
      throw new Error(
        `Identity at index ${identityIndex} is already registered on platform (identifier: ${existingIdentity.id.base58()}). ` +
        'Run "Resync identities" to import it into the extension.'
      )
    }

    // ── 5. Build asset lock transaction from the payment tx ──────────────────
    const { assetLockTx } = await buildAssetLockFromPaymentTx({
      coreSDK: this.coreSDK,
      network,
      paymentTxid: payload.paymentTxid,
      fundingAddress: payload.paymentAddress,
      fundingPrivateKeyWif: fundingPrivateKeyWASM.WIF(),
      outputIndex: payload.outputIndex
    })

    // ── 6. Broadcast the asset lock transaction ──────────────────────────────
    // Open the instant lock subscription before broadcasting so we don't miss
    // an instant lock that arrives before the subscription is established.
    const assetLockTxid = assetLockTx.hash()
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.paymentAddress],
      [hexToBytes(assetLockTxid)]
    )

    await this.coreSDK.broadcastTransaction(assetLockTx.bytes())

    // ── 7. Wait for instant lock or chain lock (whichever comes first) ──────
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

    // ── 8. Derive all identity key pairs ─────────────────────────────────────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveSeedphrasePrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 9. Build and sign identity create state transition ───────────────────
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      fundingPrivateKeyWASM,
      assetLockProof,
      this.sdk
    )

    // ── 10. Derive the new identity identifier ───────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    // ── 11. Broadcast the state transition ──────────────────────────────────
    await this.sdk.stateTransitions.broadcast(stateTransition)

    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 12. Wait for confirmation ───────────────────────────────────────────
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // ── 13. Persist identity, mark funding address as used, switch identity ─
    await this.identitiesRepository.create(identifier, IdentityType.regular, undefined, identityIndex)
    await this.fundingAddressesRepository.markAsUsed(payload.paymentAddress)
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
