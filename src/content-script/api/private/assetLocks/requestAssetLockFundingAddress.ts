import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'
import { RequestAssetLockFundingAddressPayload } from '../../../../types/messages/payloads/RequestAssetLockFundingAddressPayload'
import { WalletType } from '../../../../types/WalletType'
import { bytesToHex, deriveIdentityRegistrationKey, findNextFreeIdentityIndex, hexToBytes } from '../../../../utils'
import { encrypt } from 'eciesjs'

export class RequestAssetLockFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
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
    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null
    if (passwordPublicKey == null) throw new Error('Password is not set for an extension')

    const identities = await this.identitiesRepository.getAll()
    const localIndices = identities.map((identity) => identity.index)

    const identityIndex = await findNextFreeIdentityIndex(wallet, payload.password, localIndices, this.sdk)

    const existingEntry = await this.assetLockFundingAddressesRepository.findByIdentityIndex(identityIndex)
    if (existingEntry != null && !existingEntry.used) {
      return { address: existingEntry.address }
    }

    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
    const address = this.sdk.keyPair.p2pkhAddress(identityRegistrationKey.getPublicKey().bytes(), network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(identityRegistrationKey.hex())))

    const entry: AssetLockFundingAddressSchema = { address, encryptedPrivateKey, identityIndex, used: false }
    await this.assetLockFundingAddressesRepository.save(entry)

    return { address }
  }

  validatePayload (payload: RequestAssetLockFundingAddressPayload): null | string {
    if (payload?.password != null && typeof payload.password !== 'string') {
      return 'password must be a string'
    }

    return null
  }
}
