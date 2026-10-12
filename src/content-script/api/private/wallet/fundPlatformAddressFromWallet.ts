import { DashPlatformSDK } from 'dash-platform-sdk'
import { PlatformAddressWASM } from 'pshenmic-dpp'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { RequestAssetLockFundingAddressHandler } from '../assetLocks/requestAssetLockFundingAddress'
import { FundPlatformAddressFromCoreHandler } from './fundPlatformAddressFromCore'
import { FundPlatformAddressFromWalletPayload } from '../../../../types/messages/payloads/FundPlatformAddressFromWalletPayload'
import { FundPlatformAddressFromWalletResponse } from '../../../../types/messages/response/FundPlatformAddressFromWalletResponse'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { findUnfinishedAssetLock } from '../../../../utils/pendingAssetLocks'
import { MIN_FEE_RELAY } from '../../../../constants'

// Credits a Platform address from the wallet's own Core coins, in one call:
// reserve an asset lock funding address, pay it from the wallet's unspent
// outputs, then turn that deposit into credits on the address.
//
// The L1 counterpart of TOP_UP_IDENTITY_FROM_WALLET, and the same reason to run
// the chain in the backend: the payment and the asset lock are two
// transactions, and a caller that closes between them leaves the coins at the
// funding address. Here each step is recorded before it reaches the network, so
// a repeated call picks the deposit up instead of paying again.
export class FundPlatformAddressFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
  assetLockFunding: AssetLockFundingService
  requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler
  fundPlatformAddressFromCore: FundPlatformAddressFromCoreHandler
  sdk: DashPlatformSDK

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    assetLockFunding: AssetLockFundingService,
    requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler,
    fundPlatformAddressFromCore: FundPlatformAddressFromCoreHandler,
    sdk: DashPlatformSDK
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.assetLockFunding = assetLockFunding
    this.requestAssetLockFundingAddress = requestAssetLockFundingAddress
    this.fundPlatformAddressFromCore = fundPlatformAddressFromCore
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<FundPlatformAddressFromWalletResponse> {
    const payload: FundPlatformAddressFromWalletPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Funding a platform address from the wallet is only supported for a seedphrase wallet')
    }

    try {
      PlatformAddressWASM.fromBech32m(payload.platformAddress)
    } catch {
      throw new Error('Invalid platform address')
    }

    // An earlier attempt may have got as far as putting the asset lock on L1:
    // its credits are committed to this very address, and only the Platform side
    // is missing. Finish that one rather than pay a second time.
    const unfinished = findUnfinishedAssetLock(
      await this.pendingAssetLocksRepository.getAll(), 'fundAddress', payload.platformAddress
    )

    if (unfinished != null) {
      const resumed = await this.credit(payload.platformAddress, unfinished.fundingAddress, unfinished.fundingTxid, payload.password, event)

      return { ...resumed, coreFeeDuffs: '0', resumed: true }
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account) ??
      await deriveCoreAccountXpub(wallet, payload.password, account, this.sdk)

    // A purpose of its own, and reserved for this recipient: an address handed
    // out here is never the one an unfinished identity registration is waiting
    // for a deposit on, and never one whose deposit was paid for another
    // Platform address - that money is theirs, not this call's.
    const { address: fundingAddress } = await this.requestAssetLockFundingAddress.handle({
      ...event,
      payload: { purpose: 'fundAddress', recipient: payload.platformAddress }
    })

    const funding = await this.assetLockFunding.fundFromWallet({
      wallet,
      xpub,
      account,
      fundingAddress,
      amountDuffs: BigInt(payload.amountDuffs),
      password: payload.password,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository
    })

    const funded = await this.credit(payload.platformAddress, fundingAddress, funding.fundingTxid, payload.password, event)

    return {
      ...funded,
      coreFeeDuffs: funding.feeDuffs.toString(),
      resumed: false
    }
  }

  // The Platform half: turn this deposit into credits on the address.
  private async credit (platformAddress: string, fundingAddress: string, fundingTxid: string, password: string, event: EventData): Promise<Omit<FundPlatformAddressFromWalletResponse, 'coreFeeDuffs' | 'resumed'>> {
    const funded = await this.fundPlatformAddressFromCore.handle({
      ...event,
      payload: {
        platformAddress,
        assetLockFundingAddress: fundingAddress,
        assetLockFundingTxid: fundingTxid,
        password
      }
    })

    return {
      platformAddress: funded.platformAddress,
      stateTransitionHash: funded.stateTransitionHash,
      assetLockTxid: funded.assetLockTxid,
      fundingAddress,
      fundingTxid
    }
  }

  validatePayload (payload: FundPlatformAddressFromWalletPayload): string | null {
    if (typeof payload.platformAddress !== 'string' || payload.platformAddress.length === 0) {
      return 'platformAddress must be provided'
    }
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

    return null
  }
}
