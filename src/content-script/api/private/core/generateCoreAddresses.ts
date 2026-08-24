import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../../../utils/coreAddresses'
import { CoreAddressChain } from '../../../../types/enums/CoreAddressChain'
import { GenerateCoreAddressesPayload } from '../../../../types/messages/payloads/GenerateCoreAddressesPayload'
import { GetCoreAddressesResponse } from '../../../../types/messages/response/GetCoreAddressesResponse'

// Generates the next Core (L1) address on a chain and returns it. Derives
// publicly from the cached core xpub — normally cached at wallet creation. If the
// xpub is missing (e.g. a legacy wallet), a password must be supplied to
// initialize it. The receiving and change chains advance independently.
export class GenerateCoreAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetCoreAddressesResponse> {
    const payload: GenerateCoreAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'seedphrase') {
      throw new Error('Core addresses can only be generated for a seedphrase wallet')
    }

    const account = 0
    const chain = payload.chain ?? CoreAddressChain.receiving
    let xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      if (payload.password == null || payload.password.length === 0) {
        throw new Error('Core xpub is not initialized. Provide the wallet password to initialize it')
      }

      xpub = await deriveCoreAccountXpub(wallet, payload.password, account, this.sdk)
      await this.walletRepository.setCoreAccountXpub(account, xpub)
    }

    const start = await this.walletRepository.getCoreAddressCount(account, chain)
    const addresses = deriveCoreAddressesFromXpub(this.sdk, xpub, wallet.network, account, chain, 1, start)

    await this.walletRepository.setCoreAddressCount(account, chain, start + 1)

    return { addresses }
  }

  validatePayload (payload: GenerateCoreAddressesPayload): string | null {
    if (payload.password != null && (typeof payload.password !== 'string' || payload.password.length === 0)) {
      return 'Password must be a non-empty string when provided'
    }
    if (payload.chain != null && CoreAddressChain[payload.chain] == null) {
      return `Unknown chain ${String(payload.chain)}`
    }
    if ('account' in payload) {
      return 'Account is not supported'
    }
    if ('count' in payload) {
      return 'Count is not supported'
    }

    return null
  }
}
