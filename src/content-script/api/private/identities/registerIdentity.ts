import { DashCoreSDK } from 'dash-core-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { RegisterIdentityPayload } from '../../../../types/messages/payloads/RegisterIdentityPayload'
import { RegisterIdentityResponse } from '../../../../types/messages/response/RegisterIdentityResponse'
import { IdentityType } from '../../../../types/enums/IdentityType'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { IDENTITY_KEY_DEFINITIONS, buildIdentityCreateTransition } from '../../../../utils/identityRegistration'
import {
  deriveIdentityPrivateKey,
  findNextLocalIdentityIndex,
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

    // ── 3. Decrypt the one-time funding key ─────────────────────────────────
    // Per DIP-0011 the registration key (signs IdentityCreateTransition and
    // owns the asset lock credit output) must be single-use. The key was
    // generated as random 256-bit at requestAssetLockFundingAddress time and
    // serves three roles: signs the asset lock tx input, owns the credit
    // output, signs the IdentityCreateTransition.
    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    let assetLockFundingKeyBytes: Uint8Array
    try {
      assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
    } catch {
      throw new Error('Failed to decrypt asset lock funding key — wrong password or corrupted entry')
    }

    const assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)

    // ── 4. Find the next free identity index on-chain ───────────────────────
    // Used only for deriving identity keys (master/high/encryption/transfer).
    // The identity is recoverable from seed via auth key on-chain lookup,
    // independent of the one-time asset lock funding key. We scan past the
    // next locally-free index to skip indices whose derived auth key is
    // already registered on-chain (e.g. same seedphrase used elsewhere).
    const identities = await this.identitiesRepository.getAll()
    const localIndices = identities.map((identity) => identity.index)
    let identityIndex = findNextLocalIdentityIndex(localIndices)

    while (true) {
      const authPrivateKey = await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, 0, this.sdk)
      const pkh = authPrivateKey.getPublicKeyHash()

      const existing =
        await this.sdk.identities.getIdentityByPublicKeyHash(pkh).catch(() => null) ??
        await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh).catch(() => null)

      if (existing == null) break

      identityIndex++
    }

    // ── 5. Build asset lock transaction ─────────────────────────────────────
    // Input + credit output both use the one-time funding address.
    const { assetLockTx } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      assetLockFundingPrivateKey.WIF()
    )

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
      instantLockSub
    )

    // ── 8. Derive all identity key pairs (HD-derived for recoverability) ────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 9. Build and sign identity create state transition ──────────────────
    // Signed by the one-time funding key (= asset lock credit output owner).
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      assetLockFundingPrivateKey,
      assetLockProof,
      this.sdk
    )

    // ── 10. Derive the new identity identifier ──────────────────────────────
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
    await this.identitiesRepository.create(identifier, IdentityType.regular, identityIndex)
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

    return null
  }
}
