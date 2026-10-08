import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { TopUpIdentityPayload } from '../../../../types/messages/payloads/TopUpIdentityPayload'
import { TopUpIdentityResponse } from '../../../../types/messages/response/TopUpIdentityResponse'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { deriveCoreAccountXpub, deriveCoreAddressPrivateKey } from '../../../../utils/coreAddresses'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { Wallet } from '../../../../types/Wallet'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { deriveTopUpKeyFromHdKey, deriveWalletHdKey, hexToBytes } from '../../../../utils'
import { txidToFilterBytes } from '../../../../utils/txidToFilterBytes'
import { TOPUP_FUNDING_GAP_LIMIT, TXID_HEX_LENGTH } from '../../../../constants'
import { isIdempotentTopUpError } from '../../../../utils/isIdempotentTopUpError'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'

export class TopUpIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  coreExplorer: CoreExplorerService

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK,
    coreExplorer: CoreExplorerService
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.sdk = sdk
    this.coreSDK = coreSDK
    this.coreExplorer = coreExplorer
  }

  async handle (event: EventData): Promise<TopUpIdentityResponse> {
    const payload: TopUpIdentityPayload = event.payload

    // Resolve the (network, wallet) this top-up is bound to exactly once, then
    // address every store through it. The unscoped repositories re-read the
    // current selection on every call, so a wallet or network switch during the
    // asset lock wait below would otherwise repoint the writes at a different
    // store: the asset lock is already on L1 by then, but markAsBroadcasted /
    // markAsUsed would throw against the new store and leave the original entry
    // looking untouched. The caller names the pair explicitly; callers that do
    // not fall back to the current selection, snapshotted here.
    const scope = await this.resolveScope(payload)

    const walletRepository = this.walletRepository.forScope(scope)
    const identitiesRepository = this.identitiesRepository.forScope(scope)
    const assetLockFundingAddressesRepository = this.assetLockFundingAddressesRepository.forScope(scope)
    const pendingAssetLocksRepository = this.pendingAssetLocksRepository.forScope(scope)

    const wallet = await walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error(`Wallet ${scope.walletId} does not exist on ${scope.network}`)
    }

    const ownedIdentity = await identitiesRepository.getByIdentifier(payload.identityId)

    if (ownedIdentity == null) {
      throw new Error(`Identity ${payload.identityId} does not belong to wallet ${scope.walletId} on ${scope.network}`)
    }

    // No record means the address is not a deposit this extension handed out,
    // but one of the wallet's own: the top-up is funded from its own coins.
    const assetLockFundingAddressEntry = await assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (assetLockFundingAddressEntry?.used === true) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used`)
    }

    // An address reserved for another identity is refused rather than spent
    // toward this one, which would consume the deposit the other top-up is
    // waiting on. Entries with no owner predate per-identity reservation.
    if (
      assetLockFundingAddressEntry?.identityId != null &&
      assetLockFundingAddressEntry.identityId !== payload.identityId
    ) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} is reserved ` +
        `for identity ${assetLockFundingAddressEntry.identityId}`
      )
    }

    // Without a record, the funding output itself says whether an earlier
    // attempt already committed an asset lock, and which one.
    const committedAssetLockTxid = assetLockFundingAddressEntry == null
      ? await this.coreExplorer.getOutputSpender(payload.assetLockFundingTxid, payload.assetLockFundingAddress, wallet.network as NetworkType)
      : assetLockFundingAddressEntry.assetLockTxid ?? null

    // `assetLockFundingPrivateKey` owns the credit output and signs the top-up
    // state transition below; `inputPrivateKey` signs the asset lock inputs. A
    // deposit address is both at once. Own coins are ordinary BIP44 outputs, so
    // the two part ways: the credits still land on a DIP-13 top-up key.
    let assetLockFundingPrivateKey: PrivateKeyWASM
    let inputPrivateKey: PrivateKeyWASM
    let creditOutputAddress: string

    if (assetLockFundingAddressEntry == null) {
      const xpub = await walletRepository.getCoreAccountXpub(0) ??
        await deriveCoreAccountXpub(wallet, payload.password, 0, this.sdk)
      const { nextUnused } = await this.coreExplorer.getXpubSummary(xpub, wallet.network as NetworkType)

      inputPrivateKey = await deriveCoreAddressPrivateKey(
        wallet, payload.password, xpub, payload.assetLockFundingAddress, nextUnused, this.sdk
      )
      assetLockFundingPrivateKey = committedAssetLockTxid == null
        ? await this.freeTopUpKey(wallet, payload.password, assetLockFundingAddressesRepository)
        : await this.recoverTopUpKeyFromTxid(wallet, payload, inputPrivateKey, committedAssetLockTxid)
      creditOutputAddress = this.sdk.keyPair.p2pkhAddress(assetLockFundingPrivateKey.getPublicKey().bytes(), wallet.network as Network)
    } else {
      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let assetLockFundingKeyBytes: Uint8Array
      try {
        assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
      } catch {
        throw new Error('Failed to decrypt asset lock funding key - wrong password or corrupted entry')
      }

      assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)
      inputPrivateKey = assetLockFundingPrivateKey
      creditOutputAddress = payload.assetLockFundingAddress
    }

    // Build asset lock transaction. The build is deterministic so the same
    // inputs produce the same txid on retry.
    const { assetLockTx, lockedAmount } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      inputPrivateKey.WIF(),
      creditOutputAddress
    )

    const assetLockTxid = assetLockTx.hash()

    if (committedAssetLockTxid != null && committedAssetLockTxid !== assetLockTxid) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${committedAssetLockTxid})`
      )
    }

    // The instant lock subscription is opened in both fresh and recovery modes
    // because waitForAssetLockProof needs it to receive instant lock events
    // for txs that are not yet chain-locked.
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [txidToFilterBytes(assetLockTxid)]
    )

    if (committedAssetLockTxid == null) {
      // Written before the transaction can reach the network: from here on the
      // funds are committed on L1, and an interruption must leave a trace of
      // what was started. Removed once the credits arrive.
      await pendingAssetLocksRepository.create({
        assetLockTxid,
        fundingAddress: payload.assetLockFundingAddress,
        fundingTxid: payload.assetLockFundingTxid,
        purpose: 'topUp',
        identityId: payload.identityId,
        amountDuffs: lockedAmount.toString(),
        createdAt: Date.now()
      })

      try {
        await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      } catch (e) {
        // The explorer lags the mempool, so an asset lock broadcast moments ago
        // still reads as unspent. Rebuilt byte for byte, it is the same
        // transaction, and the network rejecting it as known is not a failure.
        if (await this.coreSDK.getTransaction(assetLockTxid).catch(() => null) == null) {
          throw e
        }
      }

      if (assetLockFundingAddressEntry != null) {
        // Persist the broadcasted txid before any further work so a crash leaves
        // a recoverable record of the L1-committed asset lock.
        await assetLockFundingAddressesRepository.markAsBroadcasted(payload.assetLockFundingAddress, assetLockTxid)
      }
    }

    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    const stateTransition = this.sdk.identities.createStateTransition('topUp', {
      identityId: payload.identityId,
      assetLockProof
    })

    stateTransition.signByPrivateKey(assetLockFundingPrivateKey, undefined, KeyType.ECDSA_SECP256K1)

    const stateTransitionHash: string = stateTransition.hash(false)

    try {
      await this.sdk.stateTransitions.broadcast(stateTransition)
      await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
    } catch (e) {
      if (!isIdempotentTopUpError(e)) {
        throw e
      }
    }

    if (assetLockFundingAddressEntry != null) {
      await assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)
    }

    await pendingAssetLocksRepository.remove(assetLockTxid)

    return {
      identityId: payload.identityId,
      stateTransitionHash,
      topUpAmount: (lockedAmount * 1000n).toString()
    }
  }

  // Credit output owner for a top-up paid with the wallet's own coins: the first
  // DIP-13 top-up key (m/9'/coin'/5'/2'/N) whose address has never appeared on
  // L1 and is not claimed by a local entry - the same rule that hands out a
  // deposit address, so the two never land on the same index.
  private async freeTopUpKey (wallet: Wallet, password: string, assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository): Promise<PrivateKeyWASM> {
    const walletHdKey = deriveWalletHdKey(wallet, password, this.sdk)

    for (let index = 0; index < TOPUP_FUNDING_GAP_LIMIT; index++) {
      const candidate = await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, index, this.sdk)
      const candidateAddress = this.sdk.keyPair.p2pkhAddress(candidate.getPublicKey().bytes(), wallet.network as Network)

      if (await assetLockFundingAddressesRepository.getByAddress(candidateAddress) != null) {
        continue
      }

      if (!await this.coreExplorer.isAddressUsed(candidateAddress, wallet.network as NetworkType)) {
        return candidate
      }
    }

    throw new Error(`No unused top-up funding index found within ${TOPUP_FUNDING_GAP_LIMIT} indexes`)
  }

  // Recovers the credit output key of an asset lock an earlier attempt already
  // committed: the index whose rebuilt transaction is that one. Nothing was
  // stored, so the committed txid read from L1 is the only anchor.
  private async recoverTopUpKeyFromTxid (wallet: Wallet, payload: TopUpIdentityPayload, inputPrivateKey: PrivateKeyWASM, committedTxid: string): Promise<PrivateKeyWASM> {
    const walletHdKey = deriveWalletHdKey(wallet, payload.password, this.sdk)

    for (let index = 0; index < TOPUP_FUNDING_GAP_LIMIT; index++) {
      const candidate = await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, index, this.sdk)
      const candidateAddress = this.sdk.keyPair.p2pkhAddress(candidate.getPublicKey().bytes(), wallet.network as Network)

      const { assetLockTx } = await buildAssetLockFromFundingTx(
        this.coreSDK,
        payload.assetLockFundingTxid,
        payload.assetLockFundingAddress,
        inputPrivateKey.WIF(),
        candidateAddress
      )

      if (assetLockTx.hash() === committedTxid) {
        return candidate
      }
    }

    throw new Error(
      `Could not recover the top-up funding index for the committed asset lock ${committedTxid} within ${TOPUP_FUNDING_GAP_LIMIT} indexes`
    )
  }

  // The pair this operation runs against: taken from the payload when the caller
  // names it, otherwise snapshotted from the current selection. Both SDKs are
  // fixed to a network for the lifetime of the document that built them —
  // `switchNetwork` re-points DashPlatformSDK but DashCoreSDK has no setter at
  // all, and a document other than the one that handled the switch keeps both at
  // its load-time network. A scope neither SDK can serve is therefore rejected
  // here, before anything is signed or broadcast, instead of sending the asset
  // lock to the wrong chain.
  private async resolveScope (payload: TopUpIdentityPayload): Promise<RepositoryScope> {
    let scope: RepositoryScope

    if (payload.walletId != null && payload.network != null) {
      scope = { network: payload.network, walletId: payload.walletId }
    } else {
      const currentWallet = await this.walletRepository.getCurrent()

      if (currentWallet == null) {
        throw new Error('No wallet is chosen')
      }

      scope = { network: currentWallet.network, walletId: currentWallet.walletId }
    }

    if (this.sdk.getNetwork() !== scope.network || this.coreSDK.network !== scope.network) {
      throw new Error(
        `Top-up is bound to ${scope.network}, but this context is connected to ` +
        `${this.sdk.getNetwork()} (platform) and ${this.coreSDK.network} (core) - reopen the top-up page`
      )
    }

    return scope
  }

  validatePayload (payload: TopUpIdentityPayload): string | null {
    if (typeof payload.identityId !== 'string' || payload.identityId.length === 0) {
      return 'identityId must be provided'
    }

    if (typeof payload.assetLockFundingAddress !== 'string' || payload.assetLockFundingAddress.length === 0) {
      return 'assetLockFundingAddress must be provided'
    }

    if (typeof payload.assetLockFundingTxid !== 'string' || payload.assetLockFundingTxid.length !== TXID_HEX_LENGTH) {
      return `assetLockFundingTxid must be a ${TXID_HEX_LENGTH}-character hex string`
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    return validateRepositoryScopePayload(payload)
  }
}
