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
import { buildAssetLockFromFundingTx, waitForAssetLockProof } from '../../../../utils/assetLock'
import { IDENTITY_KEY_DEFINITIONS, buildIdentityCreateTransition } from '../../../../utils/identityRegistration'
import {
  deriveSeedphrasePrivateKey,
  deriveIdentityRegistrationKey,
  hexToBytes
} from '../../../../utils'
import { WalletType } from '../../../../types/WalletType'
import { TXID_HEX_LENGTH } from '../../../../constants'

export class RegisterIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
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

    // ── 2. Load the asset lock funding address entry ────────────────────────
    const assetLockFundingAddressEntry = await this.assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (assetLockFundingAddressEntry == null) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} not found. ` +
        'It may belong to a different wallet or network.'
      )
    }

    if (assetLockFundingAddressEntry.used) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used for registration`)
    }

    const identityIndex = assetLockFundingAddressEntry.identityIndex

    if (!Number.isSafeInteger(identityIndex) || identityIndex < 0) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has an invalid identityIndex (${identityIndex})`)
    }

    // ── 3. Derive and verify the identity registration key ──────────────────
    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)

    const derivedAddress = this.sdk.keyPair.p2pkhAddress(
      identityRegistrationKey.getPublicKey().bytes(),
      network as Network
    )

    if (derivedAddress !== payload.assetLockFundingAddress) {
      throw new Error(
        `Stored asset lock funding address ${payload.assetLockFundingAddress} does not match derived ` +
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

    // ── 5. Build asset lock transaction from the asset lock funding tx ──────
    const { assetLockTx } = await buildAssetLockFromFundingTx({
      coreSDK: this.coreSDK,
      network,
      assetLockFundingTxid: payload.assetLockFundingTxid,
      assetLockFundingAddress: payload.assetLockFundingAddress,
      assetLockFundingPrivateKeyWif: identityRegistrationKey.WIF(),
      outputIndex: payload.outputIndex
    })

    // ── 6. Broadcast the asset lock transaction ──────────────────────────────
    // Open the instant lock subscription before broadcasting so we don't miss
    // an instant lock that arrives before the subscription is established.
    const assetLockTxid = assetLockTx.hash()
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [hexToBytes(assetLockTxid)]
    )

    await this.coreSDK.broadcastTransaction(assetLockTx.bytes())

    // ── 7. Wait for instant lock or chain lock (whichever comes first) ──────
    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      payload.assetLockFundingAddress,
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
      identityRegistrationKey,
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

    // ── 13. Persist identity, mark asset lock funding address as used, switch identity ─
    await this.identitiesRepository.create(identifier, IdentityType.regular, undefined, identityIndex)
    await this.assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)
    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
      stateTransitionHash
    }
  }

  validatePayload (payload: RegisterIdentityPayload): string | null {
    if (typeof payload.assetLockFundingAddress !== 'string' || payload.assetLockFundingAddress.length === 0) {
      return 'assetLockFundingAddress must be provided'
    }

    if (typeof payload.assetLockFundingTxid !== 'string' || payload.assetLockFundingTxid.length !== TXID_HEX_LENGTH) {
      return `assetLockFundingTxid must be a ${TXID_HEX_LENGTH}-character hex string`
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
