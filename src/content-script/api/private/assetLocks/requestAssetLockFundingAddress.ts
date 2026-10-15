import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'
import { RequestAssetLockFundingAddressPayload } from '../../../../types/messages/payloads/RequestAssetLockFundingAddressPayload'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
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

  async handle (event: EventData): Promise<RequestAssetLockFundingAddressResponse> {
    const payload: RequestAssetLockFundingAddressPayload = event.payload ?? {}
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    // Identity registration is what this handler was written for, so a caller
    // that names no purpose still gets a registration address.
    const purpose = payload.purpose ?? 'registration'
    // Who the deposit is for. An address is only reused for the same recipient:
    // an operation interrupted after paying leaves its deposit here, and handing
    // that deposit to the next recipient would credit them with someone else's
    // money and silently ignore the amount they asked for.
    const recipient = payload.recipient

    const existingUnused = await this.assetLockFundingAddressesRepository.findUnused(purpose, recipient)

    if (existingUnused != null) {
      if (recipient != null) {
        // An entry with no owner predates reservation; claim it on the way out.
        await this.assetLockFundingAddressesRepository.bindToRecipient(existingUnused.address, recipient)
      }

      return { address: existingUnused.address }
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(64), wallet.network)
    const address = this.sdk.keyPair.p2pkhAddress(privateKeyWASM.getPublicKey().bytes(), wallet.network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKeyWASM.hex())))

    await this.assetLockFundingAddressesRepository.create({
      address,
      encryptedPrivateKey,
      used: false,
      purpose,
      ...(recipient != null ? { recipient } : {})
    })

    return { address }
  }

  validatePayload (payload: RequestAssetLockFundingAddressPayload): null | string {
    if (payload?.purpose != null && !['registration', 'fundAddress', 'shield'].includes(payload.purpose)) {
      return "purpose must be 'registration', 'fundAddress' or 'shield'"
    }
    if (payload?.recipient != null && (typeof payload.recipient !== 'string' || payload.recipient.length === 0)) {
      return 'recipient must be a non-empty string when provided'
    }

    return null
  }
}
