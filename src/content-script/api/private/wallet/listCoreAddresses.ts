import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { CoreAddressEntry, deriveCoreAddressesFromXpub } from '../../../../utils/coreAddresses'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetCoreAddressesResponse } from '../../../../types/messages/response/GetCoreAddressesResponse'

// Returns every Core (L1) address created so far on both chains (indices
// 0..count-1 each), derived publicly from the cached core xpub — no password.
// Returns an empty list until addresses are created via GENERATE_CORE_ADDRESSES.
export class ListCoreAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (): Promise<GetCoreAddressesResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      return { addresses: [] }
    }

    // Receiving first, then change, each in index order — a stable order the
    // caller can render without sorting.
    const addresses: CoreAddressEntry[] = []

    for (const chain of [CoreAddressChain.receiving, CoreAddressChain.change]) {
      const count = await this.walletRepository.getCoreAddressCount(account, chain)

      if (count > 0) {
        addresses.push(...deriveCoreAddressesFromXpub(this.sdk, xpub, wallet.network, account, chain, count))
      }
    }

    return { addresses }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}
