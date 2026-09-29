import { DashCoreSDK, Transaction } from 'dash-core-sdk'
import { KeyType, Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { TopUpIdentityPayload } from '../../../../types/messages/payloads/TopUpIdentityPayload'
import { TopUpIdentityResponse } from '../../../../types/messages/response/TopUpIdentityResponse'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { CoreAssetLockService } from '../../../services/CoreAssetLockService'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { selectAssetLockUtxos } from '../../../../utils/buildAssetLockFromUtxos'
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
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  coreExplorer: CoreExplorerService
  coreAssetLock: CoreAssetLockService

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK,
    coreExplorer: CoreExplorerService,
    coreAssetLock: CoreAssetLockService
  ) {
    this.coreExplorer = coreExplorer
    this.coreAssetLock = coreAssetLock
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.sdk = sdk
    this.coreSDK = coreSDK
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

    const wallet = await walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error(`Wallet ${scope.walletId} does not exist on ${scope.network}`)
    }

    const ownedIdentity = await identitiesRepository.getByIdentifier(payload.identityId)

    if (ownedIdentity == null) {
      throw new Error(`Identity ${payload.identityId} does not belong to wallet ${scope.walletId} on ${scope.network}`)
    }

    // With no address given the wallet pays with its own coins: the record is keyed
    // by the credit output address of the DIP-13 top-up key, and an unfinished one
    // for this identity is picked up so a retry continues the same asset lock.
    const selfFunded = payload.assetLockFundingAddress == null
    let assetLockFundingAddressEntry = selfFunded
      ? (await assetLockFundingAddressesRepository.findAllUnused('topUp', payload.identityId))
          .find(entry => entry.encryptedPrivateKey == null) ?? null
      : await assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress as string)

    if (!selfFunded && assetLockFundingAddressEntry == null) {
      throw new Error(`Asset lock funding address ${String(payload.assetLockFundingAddress)} not found`)
    }

    if (assetLockFundingAddressEntry?.used === true) {
      throw new Error(`Asset lock funding address ${assetLockFundingAddressEntry.address} has already been used`)
    }

    // An address reserved for another identity is refused rather than spent
    // toward this one, which would consume the deposit the other top-up is
    // waiting on. Entries with no owner predate per-identity reservation.
    if (
      assetLockFundingAddressEntry?.identityId != null &&
      assetLockFundingAddressEntry.identityId !== payload.identityId
    ) {
      throw new Error(
        `Asset lock funding address ${assetLockFundingAddressEntry.address} is reserved ` +
        `for identity ${assetLockFundingAddressEntry.identityId}`
      )
    }

    // A deposit keeps its one-off key in the record; own coins derive the DIP-13
    // top-up key (m/9'/coin'/5'/2'/index) from the seed instead. Either way this is
    // the key that owns the credit output and signs the top-up transition.
    let assetLockFundingPrivateKey: PrivateKeyWASM
    let topUpIndex = assetLockFundingAddressEntry?.index

    if (assetLockFundingAddressEntry?.encryptedPrivateKey != null) {
      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let assetLockFundingKeyBytes: Uint8Array
      try {
        assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
      } catch {
        throw new Error('Failed to decrypt asset lock funding key - wrong password or corrupted entry')
      }

      assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)
    } else {
      const walletHdKey = deriveWalletHdKey(wallet, payload.password, this.sdk)

      topUpIndex = topUpIndex ?? await this.freeTopUpIndex(walletHdKey, wallet, assetLockFundingAddressesRepository)
      assetLockFundingPrivateKey = await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, topUpIndex, this.sdk)
    }

    const creditOutputAddress = selfFunded
      ? this.sdk.keyPair.p2pkhAddress(assetLockFundingPrivateKey.getPublicKey().bytes(), wallet.network as Network)
      : payload.assetLockFundingAddress as string

    // Build asset lock transaction. The build is deterministic so the same
    // inputs produce the same txid on retry. For a top-up the funding key both
    // funds the asset lock and owns the credit output (it signs the top-up
    // state transition below), so the credit output goes back to the funding
    // address — unlike registration, where a separate derived key owns it.
    let assetLockTx: Transaction
    let lockedAmount: bigint

    if (selfFunded) {
      assetLockTx = assetLockFundingAddressEntry?.assetLockTx != null
        ? Transaction.fromHex(assetLockFundingAddressEntry.assetLockTx)
        : await this.openSelfFundedAssetLock(wallet, payload, creditOutputAddress, topUpIndex as number, assetLockFundingAddressesRepository)

      assetLockFundingAddressEntry = await assetLockFundingAddressesRepository.getByAddress(creditOutputAddress)
      // The asset lock's own output carries the locked amount, so a resumed
      // operation reads it off the stored transaction instead of the payload.
      lockedAmount = assetLockTx.outputs[0].satoshis
    } else {
      const built = await buildAssetLockFromFundingTx(
        this.coreSDK,
        payload.assetLockFundingTxid as string,
        payload.assetLockFundingAddress as string,
        assetLockFundingPrivateKey.WIF(),
        payload.assetLockFundingAddress as string
      )

      assetLockTx = built.assetLockTx
      lockedAmount = built.lockedAmount
    }

    const fundingAddress = creditOutputAddress
    const assetLockTxid = assetLockTx.hash()

    if (
      assetLockFundingAddressEntry?.assetLockTxid != null &&
      assetLockFundingAddressEntry.assetLockTxid !== assetLockTxid
    ) {
      throw new Error(
        `Asset lock funding address ${fundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${assetLockFundingAddressEntry.assetLockTxid})`
      )
    }

    // The instant lock subscription is opened in both fresh and recovery modes
    // because waitForAssetLockProof needs it to receive instant lock events
    // for txs that are not yet chain-locked.
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [fundingAddress],
      [txidToFilterBytes(assetLockTxid)]
    )

    if (assetLockFundingAddressEntry?.assetLockTxid == null) {
      await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      // Persist the broadcasted txid before any further work so a crash leaves
      // a recoverable record of the L1-committed asset lock.
      await assetLockFundingAddressesRepository.markAsBroadcasted(fundingAddress, assetLockTxid)
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

    await assetLockFundingAddressesRepository.markAsUsed(fundingAddress)

    return {
      identityId: payload.identityId,
      stateTransitionHash,
      topUpAmount: (lockedAmount * 1000n).toString()
    }
  }

  // First DIP-13 top-up index whose address has never appeared on L1 and is not
  // claimed by a local record - the same gap scan the deposit flow uses to hand out
  // an address, so the two never land on the same index.
  private async freeTopUpIndex (
    walletHdKey: Awaited<ReturnType<typeof deriveWalletHdKey>>,
    wallet: Wallet,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  ): Promise<number> {
    for (let index = 0; index < TOPUP_FUNDING_GAP_LIMIT; index++) {
      const candidate = await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, index, this.sdk)
      const address = this.sdk.keyPair.p2pkhAddress(candidate.getPublicKey().bytes(), wallet.network as Network)

      if (await assetLockFundingAddressesRepository.getByAddress(address) != null) {
        continue
      }

      if (!await this.coreExplorer.isAddressUsed(address, wallet.network)) {
        return index
      }
    }

    throw new Error(`No unused top-up funding index found within ${TOPUP_FUNDING_GAP_LIMIT} indexes`)
  }

  // Selects the wallet's own coins, signs the asset lock and stores it with the
  // top-up index before anything reaches the network, so a retry sends that same
  // transaction instead of selecting again.
  private async openSelfFundedAssetLock (
    wallet: Wallet,
    payload: TopUpIdentityPayload,
    creditOutputAddress: string,
    topUpIndex: number,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  ): Promise<Transaction> {
    if (payload.amountCredits == null) {
      throw new Error('Funding an asset lock from your own coins needs an amount in credits')
    }

    const amountCredits = BigInt(payload.amountCredits)

    if (amountCredits % 1000n !== 0n) {
      throw new Error('Amount must be a whole number of duffs (1000 credits)')
    }

    const xpub = await this.coreAssetLock.accountXpub(this.walletRepository, wallet, payload.password)
    const [utxos, changeAddress, entries] = await Promise.all([
      this.coreAssetLock.spendableUtxos(xpub, wallet),
      this.coreAssetLock.changeAddress(xpub, wallet),
      assetLockFundingAddressesRepository.getAll()
    ])

    const plan = selectAssetLockUtxos(
      utxos,
      amountCredits / 1000n,
      creditOutputAddress,
      changeAddress,
      this.coreAssetLock.reservedOutpoints(entries)
    )

    const assetLockTx = await this.coreAssetLock.signPlan(plan, wallet, payload.password)

    await assetLockFundingAddressesRepository.create({
      address: creditOutputAddress,
      encryptedPrivateKey: null,
      used: false,
      assetLockTx: assetLockTx.hex(),
      index: topUpIndex,
      purpose: 'topUp',
      identityId: payload.identityId
    })

    return assetLockTx
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
