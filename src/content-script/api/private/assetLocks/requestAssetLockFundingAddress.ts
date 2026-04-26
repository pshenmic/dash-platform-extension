import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'
import { RequestAssetLockFundingAddressPayload } from '../../../../types/messages/payloads/RequestAssetLockFundingAddressPayload'
import { WalletType } from '../../../../types/WalletType'
import { bytesToHex, deriveIdentityRegistrationKey, hexToBytes } from '../../../../utils'
import { encrypt } from 'eciesjs'

export class RequestAssetLockFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<RequestAssetLockFundingAddressResponse> {
    const payload = (event.payload ?? {}) as RequestAssetLockFundingAddressPayload

    const wallet = await this.walletRepository.getCurrent()
    if (wallet == null) throw new Error('Wallet is not chosen')

    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Asset lock funding is only supported for seedphrase wallets')
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      throw new Error('Password is required to derive a deterministic funding address')
    }

    const network = await this.storageAdapter.get('network') as string
    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null
    if (passwordPublicKey == null) throw new Error('Password is not set for an extension')

    // Reuse an existing unused entry if any — keeps the call idempotent until
    // the address is consumed by an asset lock transaction.
    const existingUnused = await this.assetLockFundingAddressesRepository.findFirstUnused()
    if (existingUnused != null) {
      return { address: existingUnused.address }
    }

    // Derive a fresh funding key at the next funding index. The index is a
    // counter over the funding-address repo and is intentionally decoupled
    // from any identity index — funding and identity registration are
    // independent concerns.
    const allEntries = await this.assetLockFundingAddressesRepository.getAll()
    const fundingIndex = allEntries.length

    const fundingPrivateKey = await deriveIdentityRegistrationKey(wallet, payload.password, fundingIndex, this.sdk)
    const address = this.sdk.keyPair.p2pkhAddress(fundingPrivateKey.getPublicKey().bytes(), network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(fundingPrivateKey.hex())))

    const entry: AssetLockFundingAddressSchema = { address, encryptedPrivateKey, used: false }
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
