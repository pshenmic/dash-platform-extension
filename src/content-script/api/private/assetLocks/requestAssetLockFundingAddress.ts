import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { encrypt } from 'eciesjs'
import { bytesToHex, generateRandomHex, hexToBytes } from '../../../../utils'

export class RequestAssetLockFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository,
    sdk: DashPlatformSDK,
    storageAdapter: StorageAdapter
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.walletRepository = walletRepository
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  async handle (_event: EventData): Promise<RequestAssetLockFundingAddressResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    const existingUnused = await this.assetLockFundingAddressesRepository.findUnused()
    
    if (existingUnused != null) {
      return { address: existingUnused.address }
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null
    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(64), wallet.network)
    const address = this.sdk.keyPair.p2pkhAddress(privateKeyWASM.getPublicKey().bytes(), wallet.network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKeyWASM.hex())))

    await this.assetLockFundingAddressesRepository.create({
      address,
      encryptedPrivateKey,
      used: false
    })

    return { address }
  }

  validatePayload (_payload: unknown): null | string {
    return null
  }
}
