import { DashCoreSDK } from 'dash-core-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
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
import { buildAssetLockFromFundingTx, waitForAssetLockProof } from '../../../../utils/assetLock'
import { IDENTITY_KEY_DEFINITIONS, buildIdentityCreateTransition } from '../../../../utils/identityRegistration'
import {
  deriveSeedphrasePrivateKey,
  deriveIdentityRegistrationKey,
  findNextFreeIdentityIndex,
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

    // ── 3. Decrypt the funding private key (signs the asset lock tx input) ──
    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    let fundingKeyBytes: Uint8Array
    try {
      fundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
    } catch {
      throw new Error('Failed to decrypt asset lock funding key — wrong password or corrupted entry')
    }

    const fundingPrivateKey = PrivateKeyWASM.fromBytes(fundingKeyBytes, wallet.network)

    // ── 4. Find the next free identity index on-chain ───────────────────────
    // Always resolved from the network to guarantee correctness even when local
    // state is stale (e.g. identities registered on another device).
    const identities = await this.identitiesRepository.getAll()
    const localIndices = identities.map((identity) => identity.index)
    const identityIndex = await findNextFreeIdentityIndex(wallet, payload.password, localIndices, this.sdk)

    // ── 5. Derive the registration key at the free identity index ───────────
    // This key signs IdentityCreateTransition and owns the asset lock credit
    // output. Stateless: derived from seed at registration time, never stored.
    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
    const creditOutputAddress = this.sdk.keyPair.p2pkhAddress(
      identityRegistrationKey.getPublicKey().bytes(),
      network as Network
    )

    // ── 6. Build asset lock transaction ─────────────────────────────────────
    // Input: spends UTXO at funding address (signed by funding key from repo).
    // Credit output: P2PKH to creditOutputAddress (= identity registration key
    // address), so the IdentityCreateTransition signature matches per DIP-0011.
    const { assetLockTx } = await buildAssetLockFromFundingTx({
      coreSDK: this.coreSDK,
      network,
      assetLockFundingTxid: payload.assetLockFundingTxid,
      assetLockFundingAddress: payload.assetLockFundingAddress,
      assetLockFundingPrivateKeyWif: fundingPrivateKey.WIF(),
      creditOutputAddress,
      outputIndex: payload.outputIndex
    })

    // ── 7. Broadcast the asset lock transaction ──────────────────────────────
    // Open the instant lock subscription before broadcasting so we don't miss
    // an instant lock that arrives before the subscription is established.
    const assetLockTxid = assetLockTx.hash()
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [hexToBytes(assetLockTxid)]
    )

    await this.coreSDK.broadcastTransaction(assetLockTx.bytes())

    // ── 8. Wait for instant lock or chain lock (whichever comes first) ──────
    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    // ── 9. Derive all identity key pairs ─────────────────────────────────────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveSeedphrasePrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 10. Build and sign identity create state transition ───────────────────
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      identityRegistrationKey,
      assetLockProof,
      this.sdk
    )

    // ── 11. Derive the new identity identifier ───────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    // ── 12. Broadcast the state transition ──────────────────────────────────
    await this.sdk.stateTransitions.broadcast(stateTransition)

    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 13. Wait for confirmation ───────────────────────────────────────────
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // ── 14. Persist identity, mark funding address as used, switch identity ─
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
