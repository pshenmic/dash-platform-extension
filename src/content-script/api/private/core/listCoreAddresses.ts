import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { CoreAddressEntry, deriveCoreAddressesFromXpub } from '../../../../utils/coreAddresses'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetCoreAddressesResponse } from '../../../../types/messages/response/GetCoreAddressesResponse'

// Lists the Core (L1) addresses of this wallet that have been used, on both
// chains, plus the next free one on each. The extent comes from the explorer's
// gap scan, so addresses used by another install on the same seed are included;
// the addresses themselves are derived locally from the cached xpub. No password.
export class ListCoreAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, coreExplorer: CoreExplorerService, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
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

    const { nextUnused } = await this.coreExplorer.getXpubSummary(xpub, wallet.network as NetworkType)

    // Receiving first, then change, each in index order — a stable order the
    // caller can render without sorting. The next free index is included so the
    // list always shows the address currently on offer.
    const addresses: CoreAddressEntry[] = []

    for (const chain of [CoreAddressChain.receiving, CoreAddressChain.change]) {
      addresses.push(...deriveCoreAddressesFromXpub(
        this.sdk, xpub, wallet.network, account, chain, nextUnused[chain] + 1
      ))
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
