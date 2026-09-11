import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { deriveCoreAddressesFromXpub } from '../../../../utils/coreAddresses'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetCoreAddressesResponse } from '../../../../types/messages/response/GetCoreAddressesResponse'

// Returns the address to receive Core (L1) funds on: the first one on the
// receiving chain that has not appeared on-chain yet. Reading it does not
// consume it — the same address comes back until something is paid to it, which
// is how Core wallets present a receive address.
//
// Only the index comes from the explorer. The address itself is always derived
// locally from the cached xpub, because an explorer that returned addresses
// directly could hand the user one they do not own.
export class GetCoreReceiveAddressHandler implements APIHandler {
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
      throw new Error('Core xpub is not initialized. Call INIT_CORE_XPUB with the wallet password first')
    }

    const { nextUnused } = await this.coreExplorer.getXpubSummary(xpub, wallet.network as NetworkType)

    const addresses = deriveCoreAddressesFromXpub(
      this.sdk, xpub, wallet.network, account, CoreAddressChain.receiving, 1, nextUnused.receiving
    )

    return { addresses }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }
    if ('chain' in payload) {
      return 'Chain is not supported: change addresses are an internal concern of spending'
    }

    return null
  }
}
