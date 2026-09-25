import { ShieldedEncryptedNote } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedService } from '../../../services/ShieldedService'
import { Wallet } from '../../../../types/Wallet'
import { WalletType } from '../../../../types/WalletType'
import { ShieldedNote, ShieldedNotesAccount } from '../../../../types/ShieldedNotes'
import { SyncShieldedNotesPayload } from '../../../../types/messages/payloads/SyncShieldedNotesPayload'
import { ShieldedSyncState, SyncShieldedNotesResponse } from '../../../../types/messages/response/GetShieldedSyncStateResponse'

// Brings the wallet's stored shielded notes up to date with the pool, for every
// seedphrase wallet by default. Meant to be called once right after the user
// unlocks: from then on GET_SHIELDED_SYNC_STATE serves the same numbers without
// a password.
//
// Only the part of the pool that has not been trial-decrypted yet is scanned,
// which is what makes a repeat sync cheap. The pool is shared by all wallets, so
// it is fetched once here and each wallet decrypts its own view of it. A wallet
// that fails is reported in its own entry and does not stop the others.
export class SyncShieldedNotesHandler implements APIHandler {
  walletRepository: WalletRepository
  service: ShieldedService

  constructor (walletRepository: WalletRepository, service: ShieldedService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<SyncShieldedNotesResponse> {
    const payload: SyncShieldedNotesPayload = event.payload
    const account = payload.account ?? 0
    const wallets = await this.selectWallets(payload.walletId)

    if (wallets.length === 0) {
      return { wallets: [] }
    }

    const poolTotal = await this.service.getPoolTotal()
    const scanned = await Promise.all(wallets.map(async wallet => await this.fetchedNotes(wallet, account, poolTotal)))
    // Rewound to a chunk boundary: Platform refuses a read that starts inside one.
    const behind = scanned.filter(offset => offset < poolTotal)
    const from = behind.length > 0 ? this.service.chunkStart(Math.min(...behind)) : 0
    // One pass over the pool for every wallet: each of them slices out the part
    // it has not seen. When every wallet is already at the end of the pool there
    // is nothing to read, and the sync only re-checks what has been spent.
    const notes = behind.length > 0 ? await this.service.fetchNotesFrom(from, poolTotal) : []

    const entries: Array<ShieldedSyncState & { error?: string }> = []

    for (const wallet of wallets) {
      try {
        entries.push(await this.syncWallet(wallet, account, notes, from, poolTotal, payload.password))
      } catch (error) {
        const stored = await this.storedAccount(wallet, account)

        entries.push({
          ...this.service.syncState(wallet.walletId, stored ?? this.service.emptyAccount(account), stored != null),
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
  ): Promise<ShieldedSyncState> {
    const repository = this.service.repository({ walletId: wallet.walletId, network: wallet.network })

    return await repository.withLock(async () => {
      const stored = await repository.get(account)
      const known = stored != null && stored.fetched <= poolTotal ? stored : this.service.emptyAccount(account)

      const seed = this.service.deriveSeed(wallet, password)
      const addressCount = await this.walletRepository
        .forScope({ walletId: wallet.walletId, network: wallet.network })
        .getShieldedAddressCount(account)
      const addresses = this.service.deriveAddresses(wallet, password, account, addressCount)
      const diversifierIndexByAddress = new Map(addresses.map(entry => [entry.address, entry.diversifierIndex]))

      // What this wallet has not trial-decrypted yet, out of the shared slice.
      const unscanned = notes.slice(known.fetched - from)
      const recovered = this.service.recoverNotes(unscanned, known.fetched, seed, account, wallet.network, diversifierIndexByAddress)

      // Notes stored earlier are relabelled too: addresses generated since the
      // last sync turn a null diversifier index into a real one.
      const labelled = known.notes.map(note => ({
        ...note,
        diversifierIndex: diversifierIndexByAddress.get(note.address) ?? null
      }))

      const next: ShieldedNotesAccount = {
        account,
        addresses,
        notes: await this.service.refreshSpentFlags([...labelled, ...recovered] as ShieldedNote[]),
        fetched: known.fetched + unscanned.length,
        total: poolTotal,
        updatedAt: Date.now()
      }

      await repository.save(next)

      return this.service.syncState(wallet.walletId, next, true)
    })
  }

  // Shielded funds live in the seed, so keystore wallets have none to store.
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

  // Where this wallet's next scan starts. A record claiming more notes than the
  // pool holds cannot be trusted — the pool it was built against is gone — so it
  // is rescanned from the beginning.
  private async fetchedNotes (wallet: Wallet, account: number, poolTotal: number): Promise<number> {
    const stored = await this.storedAccount(wallet, account)

    return stored != null && stored.fetched <= poolTotal ? stored.fetched : 0
  }

  private async storedAccount (wallet: Wallet, account: number): Promise<ShieldedNotesAccount | null> {
    return await this.service
      .repository({ walletId: wallet.walletId, network: wallet.network })
      .get(account)
  }

  validatePayload (payload: SyncShieldedNotesPayload): string | null {
    if (typeof payload?.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return this.service.validateAccount(payload.account)
  }
}
