import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, PrivateKeyWASM } from 'dash-platform-sdk/types'
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
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { hexToBytes } from '../../../../utils'
import { TXID_HEX_LENGTH } from '../../../../constants'
import { isIdempotentTopUpError } from '../../../../utils/isIdempotentTopUpError'
import { RepositoryScope } from '../../../../types/RepositoryScope'

export class TopUpIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
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

    const assetLockFundingAddressEntry = await assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (assetLockFundingAddressEntry == null) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} not found`)
    }

    if (assetLockFundingAddressEntry.used) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used`)
    }

    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    let assetLockFundingKeyBytes: Uint8Array
    try {
      assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
    } catch {
      throw new Error('Failed to decrypt asset lock funding key - wrong password or corrupted entry')
    }

    const assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)

    // Build asset lock transaction. The build is deterministic so the same
    // inputs produce the same txid on retry. For a top-up the funding key both
    // funds the asset lock and owns the credit output (it signs the top-up
    // state transition below), so the credit output goes back to the funding
    // address — unlike registration, where a separate derived key owns it.
    const { assetLockTx } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      assetLockFundingPrivateKey.WIF(),
      payload.assetLockFundingAddress
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
      await assetLockFundingAddressesRepository.markAsBroadcasted(payload.assetLockFundingAddress, assetLockTxid)
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

    await assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)

    return {
      identityId: payload.identityId,
      stateTransitionHash
    }
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

    const hasWalletId = payload.walletId != null
    const hasNetwork = payload.network != null

    if (hasWalletId !== hasNetwork) {
      return 'walletId and network must be provided together'
    }

    if (hasWalletId && (typeof payload.walletId !== 'string' || payload.walletId.length === 0)) {
      return 'walletId must be a non-empty string'
    }

    if (hasNetwork && payload.network !== 'testnet' && payload.network !== 'mainnet') {
      return 'network must be either testnet or mainnet'
    }

    return null
  }
}
