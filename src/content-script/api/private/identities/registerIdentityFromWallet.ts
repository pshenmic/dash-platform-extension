import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { RequestAssetLockFundingAddressHandler } from '../assetLocks/requestAssetLockFundingAddress'
import { RegisterIdentityHandler } from './registerIdentity'
import { RegisterIdentityFromWalletPayload } from '../../../../types/messages/payloads/RegisterIdentityFromWalletPayload'
import { RegisterIdentityFromWalletResponse } from '../../../../types/messages/response/RegisterIdentityFromWalletResponse'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { WalletType } from '../../../../types/WalletType'
import { MIN_FEE_RELAY } from '../../../../constants'

// Registers an identity with the wallet's own Core coins, in one call: reserve
// an asset lock funding address, pay it from the wallet's unspent outputs, then
// create the identity from that deposit.
//
// The third of the Core to Platform chains, next to TOP_UP_IDENTITY_FROM_WALLET
// and FUND_PLATFORM_ADDRESS_FROM_WALLET, and interrupted the same way: a caller
// that closed between the payment and the asset lock used to leave the coins at
// the funding address with nothing coming back for them.
export class RegisterIdentityFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  assetLockFunding: AssetLockFundingService
  requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler
  registerIdentity: RegisterIdentityHandler
  sdk: DashPlatformSDK

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    assetLockFunding: AssetLockFundingService,
    requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler,
    registerIdentity: RegisterIdentityHandler,
    sdk: DashPlatformSDK
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.assetLockFunding = assetLockFunding
    this.requestAssetLockFundingAddress = requestAssetLockFundingAddress
    this.registerIdentity = registerIdentity
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<RegisterIdentityFromWalletResponse> {
    const payload: RegisterIdentityFromWalletPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Identity registration is only supported for seedphrase wallets')
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account) ??
      await deriveCoreAccountXpub(wallet, payload.password, account, this.sdk)

    // The registration pool, which is what REQUEST_ASSET_LOCK_FUNDING_ADDRESS
    // hands out by default: an address already waiting for a deposit is reused
    // rather than left behind.
    const { address: fundingAddress } = await this.requestAssetLockFundingAddress.handle({
      ...event,
      payload: { purpose: 'registration' }
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

    const registered = await this.registerIdentity.handle({
      ...event,
      payload: {
        assetLockFundingAddress: fundingAddress,
        assetLockFundingTxid: funding.fundingTxid,
        password: payload.password
      }
    })

    return {
      identifier: registered.identifier,
      stateTransitionHash: registered.stateTransitionHash,
      assetLockTxid: registered.assetLockTxid,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      coreFeeDuffs: funding.feeDuffs.toString()
    }
  }

  validatePayload (payload: RegisterIdentityFromWalletPayload): string | null {
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
