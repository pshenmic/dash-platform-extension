import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAccountXpub } from '../../../../utils'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { InitAccountXpubsPayload } from '../../../../types/messages/payloads/InitAccountXpubsPayload'
import { InitAccountXpubsResponse } from '../../../../types/messages/response/InitAccountXpubsResponse'

// Derives and caches the account-level xpubs a wallet needs, for Platform
// (DIP-17) and for Core (BIP44). Everything downstream reads addresses and
// balances from these without the seed, so they have to be produced while the
// password is at hand — which is the moment the user unlocks the extension.
//
// Wallets created since each xpub was introduced already carry it; older ones
// have no other way to catch up, because deriving needs the seed and a migration
// has no password. Caching whatever is missing is therefore idempotent, and the
// caller is meant to run it unconditionally after a successful unlock.
export class InitAccountXpubsHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<InitAccountXpubsResponse> {
    const payload: InitAccountXpubsPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    // Keystore wallets have no seed to derive from, so there is nothing to do
    // rather than anything to fail over.
    if (wallet.type !== 'seedphrase') {
      return { platform: false, core: false }
    }

    const account = 0

    const platform = await this.initPlatform(wallet, payload.password, account)
    const core = await this.initCore(wallet, payload.password, account)

    return { platform, core }
  }

  // Returns whether this call is what produced the xpub, so the caller can tell
  // a wallet that just caught up from one that already had it.
  private async initPlatform (wallet: any, password: string, account: number): Promise<boolean> {
    if (await this.walletRepository.getPlatformAccountXpub(account) != null) {
      return false
    }

    const xpub = await derivePlatformAccountXpub(wallet, password, account, this.sdk)
    await this.walletRepository.setPlatformAccountXpub(account, xpub)

    return true
  }

  private async initCore (wallet: any, password: string, account: number): Promise<boolean> {
    if (await this.walletRepository.getCoreAccountXpub(account) != null) {
      return false
    }

    const xpub = await deriveCoreAccountXpub(wallet, password, account, this.sdk)
    await this.walletRepository.setCoreAccountXpub(account, xpub)

    return true
  }

  validatePayload (payload: InitAccountXpubsPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return null
  }
}
