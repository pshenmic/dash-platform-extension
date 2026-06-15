import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { RequestTopUpFundingAddressPayload } from '../../../../types/messages/payloads/RequestTopUpFundingAddressPayload'
import { RequestTopUpFundingAddressResponse } from '../../../../types/messages/response/RequestTopUpFundingAddressResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { encrypt } from 'eciesjs'
import { bytesToHex, hexToBytes, deriveIdentityTopUpKey } from '../../../../utils'
import { TOPUP_FUNDING_GAP_LIMIT } from '../../../../constants'

export class RequestTopUpFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository,
    coreExplorer: CoreExplorerService,
    sdk: DashPlatformSDK,
    storageAdapter: StorageAdapter
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<RequestTopUpFundingAddressResponse> {
    const payload: RequestTopUpFundingAddressPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    // Reuse an in-flight top-up funding address if one is still pending (shown
    // to the user but not yet spent into an asset lock). Keeps the request
    // idempotent and avoids burning a fresh derivation index per click.
    const existingUnused = await this.assetLockFundingAddressesRepository.findUnused('topUp')

    if (existingUnused != null) {
      return { address: existingUnused.address }
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    // Gap-scan DIP-13 top-up funding indexes (m/9'/coin'/5'/2'/N) for the first
    // address that has never appeared on L1 (per dashscan) and is not already
    // claimed by a local entry. Deterministic derivation is what makes the
    // chosen index recoverable from seed later.
    let foundIndex = -1
    let foundKeyHex: string | null = null
    let foundAddress: string | null = null

    for (let index = 0; index < TOPUP_FUNDING_GAP_LIMIT; index++) {
      const candidate = await deriveIdentityTopUpKey(wallet, payload.password, index, this.sdk)
      const candidateAddress = this.sdk.keyPair.p2pkhAddress(candidate.getPublicKey().bytes(), wallet.network as Network)

      const localEntry = await this.assetLockFundingAddressesRepository.getByAddress(candidateAddress)

      if (localEntry != null) {
        continue
      }

      const used = await this.coreExplorer.isAddressUsed(candidateAddress, wallet.network as NetworkType)

      if (!used) {
        foundIndex = index
        foundKeyHex = candidate.hex()
        foundAddress = candidateAddress
        break
      }
    }

    if (foundAddress == null || foundKeyHex == null) {
      throw new Error(`No unused top-up funding address found within ${TOPUP_FUNDING_GAP_LIMIT} indexes`)
    }

    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(foundKeyHex)))

    await this.assetLockFundingAddressesRepository.create({
      address: foundAddress,
      encryptedPrivateKey,
      used: false,
      index: foundIndex,
      purpose: 'topUp'
    })

    return { address: foundAddress }
  }

  validatePayload (payload: RequestTopUpFundingAddressPayload): null | string {
    if (typeof payload?.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    return null
  }
}
