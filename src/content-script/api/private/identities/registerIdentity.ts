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
  deriveIdentityRegistrationKey,
  findNextLocalIdentityIndex,
  hexToBytes,
  wait
} from '../../../../utils'
import { isStateTransitionAlreadyInChainError } from '../../../../utils/isStateTransitionAlreadyInChainError'
import { isIdentityNotFoundError } from '../../../../utils/isIdentityNotFoundError'
import { WalletType } from '../../../../types/WalletType'
import { TXID_HEX_LENGTH, IDENTITY_INDEX_SCAN_LIMIT, REGISTRATION_CONFIRM_TIMEOUT_MS } from '../../../../constants'

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
    // The funding key signs the asset lock tx inputs only. Credit output
    // ownership and Platform ST signing are handled by identityRegistrationKey
    // derived in step 5 (DIP-0013).
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
    const startIndex = findNextLocalIdentityIndex(localIndices)
    const scanLimit = startIndex + IDENTITY_INDEX_SCAN_LIMIT

    let identityIndex = startIndex
    let foundFreeIndex = false

    while (identityIndex < scanLimit) {
      const authPrivateKey = await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, 0, this.sdk)

      if (!(await this.isIdentityRegistered(authPrivateKey.getPublicKeyHash()))) {
        foundFreeIndex = true
        break
      }

      identityIndex++
    }

    if (!foundFreeIndex) {
      throw new Error(
        `Could not find a free identity index within ${IDENTITY_INDEX_SCAN_LIMIT} indexes from ${startIndex}`
      )
    }

    // ── 5. Derive identity registration key (DIP-0013 path 5'/1'/index) ────
    // This key owns the asset lock credit output and signs the
    // IdentityCreateTransition. Derived from seed — recoverable without storage.
    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
    const creditOutputAddress = this.sdk.keyPair.p2pkhAddress(identityRegistrationKey.getPublicKey().bytes(), wallet.network as any)

    // ── 6. Build asset lock transaction ─────────────────────────────────────
    // Inputs are signed by the one-time funding key. Credit output goes to
    // creditOutputAddress (registration key). Build is deterministic on retry.
    const { assetLockTx } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      assetLockFundingPrivateKey.WIF(),
      creditOutputAddress
    )

    const assetLockTxid = assetLockTx.hash()

    if (
      assetLockFundingAddressEntry.assetLockTxid != null &&
      assetLockFundingAddressEntry.assetLockTxid !== assetLockTxid
    ) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${assetLockFundingAddressEntry.assetLockTxid})`
      )
    }

    // ── 7. Broadcast the asset lock transaction (skip if already broadcast) ─
    // The instant lock subscription is opened in both fresh and recovery modes
    // because waitForAssetLockProof needs it to receive instant lock events
    // for txs that are not yet chain-locked.
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [hexToBytes(assetLockTxid)]
    )

    if (assetLockFundingAddressEntry.assetLockTxid == null) {
      await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      // Persist the broadcasted txid before any further work so a crash leaves
      // a recoverable record of the L1-committed asset lock.
      await this.assetLockFundingAddressesRepository.markAsBroadcasted(payload.assetLockFundingAddress, assetLockTxid)
    }

    // ── 8. Wait for instant lock or chain lock (whichever comes first) ──────
    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    // ── 9. Derive all identity key pairs (HD-derived for recoverability) ────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 10. Build and sign identity create state transition ─────────────────
    // Signed by the identity registration key (DIP-0013) which owns the credit
    // output. The funding key is not used for Platform signing.
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      identityRegistrationKey,
      assetLockProof,
      this.sdk
    )

    // ── 11. Derive the new identity identifier ──────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 12. Persist identity in repo before broadcasting the state transition.
    // If the broadcast fails with a non-idempotent error we roll back this
    // record so the local state never contains a phantom identity. If the
    // identifier is already present (e.g. previous attempt reached this step),
    // we treat it as recovery and skip the create.
    const existingIdentity = await this.identitiesRepository.getByIdentifier(identifier)
    let wasJustCreated = false

    if (existingIdentity == null) {
      await this.identitiesRepository.create(identifier, IdentityType.regular, identityIndex)
      wasJustCreated = true
    }

    // ── 13. Broadcast the state transition ──────────────────────────────────
    let alreadyOnPlatform = false

    try {
      await this.sdk.stateTransitions.broadcast(stateTransition)
    } catch (e) {
      if (isStateTransitionAlreadyInChainError(e)) {
        alreadyOnPlatform = true
      } else {
        if (wasJustCreated) {
          await this.identitiesRepository.remove(identifier)
        }
        throw e
      }
    }

    // ── 14. Best-effort confirmation. The identity is already created by the
    // broadcast above, so wait only briefly for finalization (usually 1-3s) and
    // return once it exists rather than blocking indefinitely if the confirmation
    // stream is slow. A genuine state-transition failure still rolls back.
    if (!alreadyOnPlatform) {
      try {
        await Promise.race([
          this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition),
          wait(REGISTRATION_CONFIRM_TIMEOUT_MS).then(() => { throw new Error('confirmation-timeout') })
        ])
      } catch (e) {
        const isTimeout = e instanceof Error && e.message === 'confirmation-timeout'

        if (!isTimeout) {
          if (wasJustCreated) {
            await this.identitiesRepository.remove(identifier)
          }

          throw e
        }
      }
    }

    // ── 15. Mark funding address as used and switch identity ────────────────
    await this.assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)
    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
      stateTransitionHash
    }
  }

  // Returns whether an identity is already registered on-chain for this auth
  // key public key hash. Only a genuine "not found" (from both the unique and
  // non-unique lookups) counts as a free index; any other error (network /
  // DAPI / proof) is rethrown so a transient failure is never mistaken for a
  // free index and used to register a colliding key.
  private async isIdentityRegistered (pkh: string): Promise<boolean> {
    const lookups = [
      async () => await this.sdk.identities.getIdentityByPublicKeyHash(pkh),
      async () => await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh)
    ]

    for (const lookup of lookups) {
      try {
        if ((await lookup()) != null) {
          return true
        }
      } catch (e) {
        if (!isIdentityNotFoundError(e)) {
          throw e
        }
      }
    }

    return false
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
