import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Wallet } from '../../../../types/Wallet'
import { NetworkType } from '../../../../types/NetworkType'
import { Network } from '../../../../types/enums/Network'
import { derivePlatformAccountXpub } from '../../../../utils'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { InitAccountXpubsPayload } from '../../../../types/messages/payloads/InitAccountXpubsPayload'
import { InitAccountXpubsResponse, InitAccountXpubsWallet } from '../../../../types/messages/response/InitAccountXpubsResponse'

// Derives and caches the account-level xpubs every wallet needs, for Platform
// (DIP-17) and for Core (BIP44). Address and balance reads work from these
// without the seed, so they have to be produced while the password is at hand,
// which is the moment the user unlocks the extension.
//
// Wallets created since each xpub was introduced already carry it; older ones
// have no other way to catch up, because deriving needs the seed and a migration
// has no password. So this walks every wallet on both networks and fills in
// whatever is missing, rather than only the one currently selected: the user
// unlocks once and stops meeting the error wherever they switch next.
//
// Caching what is already there is a no-op, so the caller runs this
// unconditionally after a successful unlock.
export class InitAccountXpubsHandler implements APIHandler {
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<InitAccountXpubsResponse> {
    const payload: InitAccountXpubsPayload = event.payload

    const walletIds = (await this.storageAdapter.get('wallets') ?? []) as string[]
    const account = 0

    const wallets: InitAccountXpubsWallet[] = []
    const failed: Array<{ walletId: string, network: NetworkType }> = []
    let initialized = 0

    // A wallet id is global but its record is stored per network, so the same id
    // may exist on one network and not the other. Scoping the repository to the
    // pair reads it without disturbing the selection the user came back to.
    for (const network of [Network.mainnet, Network.testnet]) {
      for (const walletId of walletIds) {
        const scoped = this.walletRepository.forScope({ network: network as NetworkType, walletId })
        const wallet = await scoped.getCurrent()

        // Absent on this network, or a keystore wallet with no seed to derive from.
        if (wallet == null || wallet.type !== 'seedphrase') {
          continue
        }

        try {
          const platform = await this.initPlatform(scoped, wallet, payload.password, account)
          const core = await this.initCore(scoped, wallet, payload.password, account)

          initialized += (platform ? 1 : 0) + (core ? 1 : 0)
          wallets.push({ walletId, network: network as NetworkType, platform, core })
        } catch (e) {
          // One unreadable record must not keep every other wallet uninitialized,
          // so it is reported rather than thrown.
          console.warn(`Could not derive account xpubs for wallet ${walletId} on ${network}`, e)
          failed.push({ walletId, network: network as NetworkType })
        }
      }
    }

    return { initialized, wallets, failed }
  }

  // Each returns whether this call is what produced the xpub, so the caller can
  // tell a wallet that just caught up from one that already had it.
  private async initPlatform (repository: WalletRepository, wallet: Wallet, password: string, account: number): Promise<boolean> {
    if (await repository.getPlatformAccountXpub(account) != null) {
      return false
    }

    await repository.setPlatformAccountXpub(account, await derivePlatformAccountXpub(wallet, password, account, this.sdk))

    return true
  }

  private async initCore (repository: WalletRepository, wallet: Wallet, password: string, account: number): Promise<boolean> {
    if (await repository.getCoreAccountXpub(account) != null) {
      return false
    }

    await repository.setCoreAccountXpub(account, await deriveCoreAccountXpub(wallet, password, account, this.sdk))

    return true
  }

  validatePayload (payload: InitAccountXpubsPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return null
  }
}
