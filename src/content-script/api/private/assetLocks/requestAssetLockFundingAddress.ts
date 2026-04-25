import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'
import { RequestAssetLockFundingAddressPayload } from '../../../../types/messages/payloads/RequestAssetLockFundingAddressPayload'
import { WalletType } from '../../../../types/WalletType'
import { deriveIdentityRegistrationKey, findNextFreeIdentityIndex } from '../../../../utils'

export class RequestAssetLockFundingAddressHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<RequestAssetLockFundingAddressResponse> {
    const payload = (event.payload ?? {}) as RequestAssetLockFundingAddressPayload

    const wallet = await this.walletRepository.getCurrent()
    if (wallet == null) throw new Error('Wallet is not chosen')

    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Identity registration is only supported for seedphrase wallets')
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      throw new Error('Password is required to derive a deterministic registration address')
    }

    const network = await this.storageAdapter.get('network') as string

    const identities = await this.identitiesRepository.getAll()
    const localIndices = identities.map((identity) => identity.index)

    // on-chain scan to find the next free identity index
    const identityIndex = await findNextFreeIdentityIndex(wallet, payload.password, localIndices, this.sdk)

    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
    const address = this.sdk.keyPair.p2pkhAddress(identityRegistrationKey.getPublicKey().bytes(), network as Network)

    return { address }
  }

  validatePayload (payload: RequestAssetLockFundingAddressPayload): null | string {
    if (payload?.password != null && typeof payload.password !== 'string') {
      return 'password must be a string'
    }

    return null
  }
}
