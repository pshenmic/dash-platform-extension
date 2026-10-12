import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { ShieldedService } from '../../../services/ShieldedService'
import { RequestAssetLockFundingAddressHandler } from '../assetLocks/requestAssetLockFundingAddress'
import { ShieldFromCoreHandler } from './shieldFromCore'
import { ShieldFromWalletPayload } from '../../../../types/messages/payloads/ShieldFromWalletPayload'
import { ShieldFromWalletResponse } from '../../../../types/messages/response/ShieldFromWalletResponse'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { computeShieldedDepositFee } from '../../../../utils/shieldedFee'
import { CREDITS_PER_DUFF, MIN_FEE_RELAY } from '../../../../constants'

// Shields the wallet's own Core (L1) coins: pays an asset lock funding address
// out of the wallet's unspent outputs, then hands that deposit to
// SHIELD_FROM_CORE, which locks it and deposits its credits into the pool.
//
// Splitting it there is what makes a shield resumable. Once the asset lock is on
// L1 this method cannot be the way back in - it would start over with a fresh
// funding address and pay twice - so an interrupted shield is finished by
// calling SHIELD_FROM_CORE with the address and transaction
// LIST_PENDING_ASSET_LOCKS reports for it.
export class ShieldFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  assetLockFunding: AssetLockFundingService
  requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler
  shieldFromCore: ShieldFromCoreHandler
  sdk: DashPlatformSDK
  shielded: ShieldedService

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    assetLockFunding: AssetLockFundingService,
    requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler,
    shieldFromCore: ShieldFromCoreHandler,
    sdk: DashPlatformSDK,
    shielded: ShieldedService
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.assetLockFunding = assetLockFunding
    this.requestAssetLockFundingAddress = requestAssetLockFundingAddress
    this.shieldFromCore = shieldFromCore
    this.sdk = sdk
    this.shielded = shielded
  }

  async handle (event: EventData): Promise<ShieldFromWalletResponse> {
    const payload: ShieldFromWalletPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielding from the wallet is only supported for a seedphrase wallet')
    }

    const xpub = await this.walletRepository.getCoreAccountXpub(0) ??
      await deriveCoreAccountXpub(wallet, payload.password, 0, this.sdk)

    // A purpose of its own: a deposit meant for the pool is never the address an
    // unfinished identity registration is waiting on.
    const { address: fundingAddress } = await this.requestAssetLockFundingAddress.handle({
      ...event,
      payload: { purpose: 'shield' }
    })

    const funding = await this.assetLockFunding.fundFromWallet({
      wallet,
      xpub,
      fundingAddress,
      amountDuffs: BigInt(payload.amountDuffs),
      password: payload.password,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository
    })

    const shielded = await this.shieldFromCore.handle({
      ...event,
      payload: {
        assetLockFundingAddress: fundingAddress,
        assetLockFundingTxid: funding.fundingTxid,
        password: payload.password,
        toShieldedAddress: payload.toShieldedAddress,
        memo: payload.memo,
        account: payload.account
      }
    })

    return {
      stHash: shielded.stHash,
      shieldedAmountCredits: shielded.shieldedAmountCredits,
      shieldFeeCredits: shielded.shieldFeeCredits,
      toShieldedAddress: shielded.toShieldedAddress,
      assetLockTxid: shielded.assetLockTxid,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      coreFeeDuffs: funding.feeDuffs.toString()
    }
  }

  validatePayload (payload: ShieldFromWalletPayload): string | null {
    if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs)) {
      return 'amountDuffs must be a positive integer string of duffs'
    }
    // Below this there is nothing left to lock, let alone to shield: the asset
    // lock pays its own fee out of the deposit, and the pool takes its own.
    if (BigInt(payload.amountDuffs) <= MIN_FEE_RELAY + computeShieldedDepositFee() / CREDITS_PER_DUFF) {
      return `amountDuffs must be greater than the asset lock fee plus the shield fee (${(MIN_FEE_RELAY + computeShieldedDepositFee() / CREDITS_PER_DUFF).toString()} duffs)`
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }
    if (payload.toShieldedAddress != null && typeof payload.toShieldedAddress !== 'string') {
      return 'toShieldedAddress must be a string'
    }

    const memoError = this.shielded.validateMemo(payload.memo)

    if (memoError != null) {
      return memoError
    }

    return this.shielded.validateAccount(payload.account)
  }
}
