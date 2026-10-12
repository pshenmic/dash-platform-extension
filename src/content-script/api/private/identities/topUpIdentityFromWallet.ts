import { DashCoreSDK } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { RequestTopUpFundingAddressHandler } from '../assetLocks/requestTopUpFundingAddress'
import { TopUpIdentityHandler } from './topUpIdentity'
import { TopUpIdentityFromWalletPayload } from '../../../../types/messages/payloads/TopUpIdentityFromWalletPayload'
import { TopUpIdentityFromWalletResponse } from '../../../../types/messages/response/TopUpIdentityFromWalletResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { MIN_FEE_RELAY } from '../../../../constants'

// Tops up an identity with the wallet's own Core coins, in one call: reserve a
// DIP-13 top-up funding address, pay it from the wallet's unspent outputs, then
// turn that deposit into credits.
//
// The three steps used to be the caller's to sequence, which left the money
// stranded whenever the popup closed in between. Here the chain runs in the
// backend, and every step is written down before it touches the network, so a
// repeated call continues from where the last one stopped instead of paying
// twice.
export class TopUpIdentityFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  assetLockFunding: AssetLockFundingService
  requestTopUpFundingAddress: RequestTopUpFundingAddressHandler
  topUpIdentity: TopUpIdentityHandler
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    assetLockFunding: AssetLockFundingService,
    requestTopUpFundingAddress: RequestTopUpFundingAddressHandler,
    topUpIdentity: TopUpIdentityHandler,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.assetLockFunding = assetLockFunding
    this.requestTopUpFundingAddress = requestTopUpFundingAddress
    this.topUpIdentity = topUpIdentity
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<TopUpIdentityFromWalletResponse> {
    const payload: TopUpIdentityFromWalletPayload = event.payload

    // Resolved once and handed to every step, so the funding address, the
    // payment and the credits all belong to the same (network, wallet) even if
    // the selection changes while the asset lock is waiting for its lock.
    const scope = await this.resolveScope(payload)

    const walletRepository = this.walletRepository.forScope(scope)
    const wallet = await walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error(`Wallet ${scope.walletId} does not exist on ${scope.network}`)
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Topping up from the wallet is only supported for a seedphrase wallet')
    }

    const identityId = payload.identityId ?? wallet.currentIdentity

    if (identityId == null) {
      throw new Error('No identity is chosen to top up')
    }

    const account = 0
    // The payment spends the wallet's BIP44 outputs, so the account xpub has to
    // be there. A wallet made before Core support has none cached; deriving it
    // costs one decryption of the seed, which this call has the password for.
    const xpub = await walletRepository.getCoreAccountXpub(account) ??
      await deriveCoreAccountXpub(wallet, payload.password, account, this.sdk)

    const { address: fundingAddress } = await this.requestTopUpFundingAddress.handle({
      ...event,
      payload: {
        password: payload.password,
        identityId,
        walletId: scope.walletId,
        network: scope.network
      }
    })

    const funding = await this.assetLockFunding.fundFromWallet({
      wallet,
      xpub,
      account,
      fundingAddress,
      amountDuffs: BigInt(payload.amountDuffs),
      password: payload.password,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository.forScope(scope)
    })

    const topUp = await this.topUpIdentity.handle({
      ...event,
      payload: {
        identityId,
        assetLockFundingAddress: fundingAddress,
        assetLockFundingTxid: funding.fundingTxid,
        password: payload.password,
        walletId: scope.walletId,
        network: scope.network
      }
    })

    return {
      identityId: topUp.identityId,
      stateTransitionHash: topUp.stateTransitionHash,
      topUpAmount: topUp.topUpAmount,
      assetLockTxid: topUp.assetLockTxid,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      coreFeeDuffs: funding.feeDuffs.toString()
    }
  }

  // Same contract as TOP_UP_IDENTITY, and the same reason to check both SDKs:
  // they are fixed to a network for the lifetime of the document that built
  // them, and this call spends real coins before the top-up handler gets to make
  // the check itself.
  private async resolveScope (payload: TopUpIdentityFromWalletPayload): Promise<RepositoryScope> {
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

  validatePayload (payload: TopUpIdentityFromWalletPayload): string | null {
    if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs)) {
      return 'amountDuffs must be a positive integer string of duffs'
    }
    // Below this there is nothing left to lock: the asset lock pays its own fee
    // out of the deposit.
    if (BigInt(payload.amountDuffs) <= MIN_FEE_RELAY) {
      return `amountDuffs must be greater than the asset lock fee (${MIN_FEE_RELAY.toString()} duffs)`
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }
    if (payload.identityId != null && (typeof payload.identityId !== 'string' || payload.identityId.length === 0)) {
      return 'identityId must be a non-empty string when provided'
    }

    return validateRepositoryScopePayload(payload)
  }
}
