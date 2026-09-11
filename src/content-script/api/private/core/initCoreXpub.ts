import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { InitCoreXpubPayload } from '../../../../types/messages/payloads/InitCoreXpubPayload'

// Derives and caches the BIP44 account xpub a wallet needs before any Core (L1)
// address or balance can be read. Wallets created since Core support landed get
// it at creation time; this is the one way an older wallet can catch up, since
// deriving it needs the seed and therefore the password. Caching it once is what
// keeps every later Core read password-free.
export class InitCoreXpubHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<{ ready: boolean }> {
    const payload: InitCoreXpubPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'seedphrase') {
      throw new Error('Core addresses are only available for a seedphrase wallet')
    }

    const account = 0

    // Already cached, from wallet creation or an earlier call. Deriving again
    // would produce the same xpub, so this is a no-op rather than an error: the
    // caller can run it unconditionally after unlocking.
    if (await this.walletRepository.getCoreAccountXpub(account) != null) {
      return { ready: true }
    }

    const xpub = await deriveCoreAccountXpub(wallet, payload.password, account, this.sdk)

    await this.walletRepository.setCoreAccountXpub(account, xpub)

    return { ready: true }
  }

  validatePayload (payload: InitCoreXpubPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return null
  }
}
