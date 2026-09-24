import { ShieldedEncryptedNote } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedCacheService } from '../../../services/ShieldedCacheService'
import { Wallet } from '../../../../types/Wallet'
import { WalletType } from '../../../../types/WalletType'
import { ShieldedAccountCache, ShieldedCachedNote } from '../../../../types/ShieldedCache'
import { SyncShieldedCachePayload } from '../../../../types/messages/payloads/SyncShieldedCachePayload'
import { ShieldedCacheEntry, SyncShieldedCacheResponse } from '../../../../types/messages/response/GetShieldedCacheResponse'
import { emptyShieldedCache, shieldedCacheResponse, validateShieldedCacheAccount } from './shieldedCachePayload'

// Brings the shielded cache up to date with the pool, for every seedphrase
// wallet by default. Meant to be called once right after the user unlocks: from
// then on GET_SHIELDED_CACHE serves the same numbers without a password.
//
// Only the part of the pool that has not been trial-decrypted yet is scanned,
// which is what makes a repeat sync cheap. The pool is shared by all wallets, so
// it is fetched once here and each wallet decrypts its own view of it. A wallet
// that fails is reported in its own entry and does not stop the others.
export class SyncShieldedCacheHandler implements APIHandler {
  walletRepository: WalletRepository
  service: ShieldedCacheService

  constructor (walletRepository: WalletRepository, service: ShieldedCacheService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<SyncShieldedCacheResponse> {
    const payload: SyncShieldedCachePayload = event.payload
    const account = payload.account ?? 0
    const wallets = await this.selectWallets(payload.walletId)

    if (wallets.length === 0) {
      return { wallets: [] }
    }

    const poolTotal = await this.service.poolTotal()
    const scanned = await Promise.all(wallets.map(async wallet => await this.scannedNotes(wallet, account, poolTotal)))
    // Rewound to a chunk boundary: Platform refuses a read that starts inside one.
    const from = this.service.chunkStart(Math.min(...scanned))
    // One pass over the pool for every wallet: each of them slices out the part
    // it has not seen.
    const notes = poolTotal > from ? await this.service.fetchNotesFrom(from, poolTotal) : []

    const entries: Array<ShieldedCacheEntry & { error?: string }> = []

    for (const wallet of wallets) {
      try {
        entries.push(await this.syncWallet(wallet, account, notes, from, poolTotal, payload.password))
      } catch (error) {
        const cache = await this.cacheOf(wallet, account)

        entries.push({
          ...shieldedCacheResponse(wallet.walletId, cache ?? emptyShieldedCache(account), cache != null),
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return { wallets: entries }
  }

  // Scans this wallet's share of the fetched pool slice, re-checks what has been
  // spent and stores the result. Held under the wallet's lock so a second sync of
  // the same wallet cannot append the same notes twice.
  private async syncWallet (
    wallet: Wallet,
    account: number,
    notes: ShieldedEncryptedNote[],
    from: number,
    poolTotal: number,
    password: string
  ): Promise<ShieldedCacheEntry> {
    const repository = this.service.repository({ walletId: wallet.walletId, network: wallet.network })

    return await repository.withLock(async () => {
      const stored = await repository.get(account)
      const cache = stored != null && stored.scannedNotes <= poolTotal ? stored : emptyShieldedCache(account)

      const seed = this.service.seed(wallet, password)
      const addressCount = await this.walletRepository
        .forScope({ walletId: wallet.walletId, network: wallet.network })
        .getShieldedAddressCount(account)
      const addresses = this.service.addresses(wallet, password, account, addressCount)
      const diversifierIndexByAddress = new Map(addresses.map(entry => [entry.address, entry.diversifierIndex]))

      // What this wallet has not trial-decrypted yet, out of the shared slice.
      const unscanned = notes.slice(cache.scannedNotes - from)
      const recovered = this.service.recoverNotes(unscanned, cache.scannedNotes, seed, account, wallet.network, diversifierIndexByAddress)

      // Notes cached earlier are relabelled too: addresses generated since the
      // last sync turn a null diversifier index into a real one.
      const known = cache.notes.map(note => ({
        ...note,
        diversifierIndex: diversifierIndexByAddress.get(note.address) ?? null
      }))

      const next: ShieldedAccountCache = {
        account,
        addresses,
        notes: await this.service.refreshSpentFlags([...known, ...recovered] as ShieldedCachedNote[]),
        scannedNotes: cache.scannedNotes + unscanned.length,
        poolTotal,
        updatedAt: Date.now()
      }

      await repository.save(next)

      return shieldedCacheResponse(wallet.walletId, next, true)
    })
  }

  // Shielded funds live in the seed, so keystore wallets have none to cache.
  private async selectWallets (walletId?: string): Promise<Wallet[]> {
    const wallets = (await this.walletRepository.getAll())
      .filter(wallet => wallet.type === WalletType.seedphrase && wallet.encryptedMnemonic != null)

    if (walletId == null) {
      return wallets
    }

    const wallet = wallets.find(candidate => candidate.walletId === walletId)

    if (wallet == null) {
      throw new Error(`Wallet ${walletId} cannot hold shielded funds`)
    }

    return [wallet]
  }

  // Where this wallet's next scan starts. A cache claiming more notes than the
  // pool holds cannot be trusted — the pool it was built against is gone — so it
  // is rescanned from the beginning.
  private async scannedNotes (wallet: Wallet, account: number, poolTotal: number): Promise<number> {
    const cache = await this.cacheOf(wallet, account)

    return cache != null && cache.scannedNotes <= poolTotal ? cache.scannedNotes : 0
  }

  private async cacheOf (wallet: Wallet, account: number): Promise<ShieldedAccountCache | null> {
    return await this.service
      .repository({ walletId: wallet.walletId, network: wallet.network })
      .get(account)
  }

  validatePayload (payload: SyncShieldedCachePayload): string | null {
    if (typeof payload?.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return validateShieldedCacheAccount(payload.account)
  }
}
