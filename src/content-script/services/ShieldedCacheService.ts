import { DashPlatformSDK } from 'dash-platform-sdk'
import { ShieldedEncryptedNote } from 'dash-platform-sdk/types'
import { StorageAdapter } from '../storage/storageAdapter'
import { ShieldedCacheRepository } from '../repository/ShieldedCacheRepository'
import { RepositoryScope } from '../../types/RepositoryScope'
import { Wallet } from '../../types/Wallet'
import { NetworkType } from '../../types/NetworkType'
import { ShieldedCachedAddress, ShieldedCachedNote } from '../../types/ShieldedCache'
import { SHIELDED_NOTES_PAGE_SIZE } from '../../constants'
import { bytesToHex, decryptMnemonic, deriveShieldedAddresses, getShieldedNullifierStatuses, hexToBytes, recoveredNoteNullifier } from '../../utils'

// Domain primitives for the shielded cache: reading the pool, recovering this
// wallet's notes out of it and re-checking what has been spent. The handlers
// decide when each one runs and what ends up in storage.
export class ShieldedCacheService {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  repository (scope?: RepositoryScope): ShieldedCacheRepository {
    const repository = new ShieldedCacheRepository(this.storageAdapter)

    return scope != null ? repository.forScope(scope) : repository
  }

  // Number of notes (commitment-tree leaves) the pool holds right now.
  async poolTotal (): Promise<number> {
    return Number(await this.sdk.shielded.getShieldedNotesCount() ?? 0n)
  }

  // Where a scan that has seen `scanned` notes may start reading. Platform serves
  // the pool in chunks the size of a full query and refuses a start inside one
  // ("start_index is not chunk-aligned; must be a multiple of max_elements"), so
  // the offset rewinds to its chunk boundary. The notes between the boundary and
  // `scanned` are read again; the caller skips them instead of decrypting them
  // twice, which is where the cost is.
  chunkStart (scanned: number): number {
    return Math.floor(scanned / SHIELDED_NOTES_PAGE_SIZE) * SHIELDED_NOTES_PAGE_SIZE
  }

  // Pages the pool from `start` to its end, preserving global leaf order so a
  // note's position in the returned array plus `start` is its leaf position.
  // `start` must be a chunk boundary — see `chunkStart`.
  async fetchNotesFrom (start: number, total: number): Promise<ShieldedEncryptedNote[]> {
    const notes: ShieldedEncryptedNote[] = []

    for (let offset = start; offset < total; offset += SHIELDED_NOTES_PAGE_SIZE) {
      const page = await this.sdk.shielded.getShieldedEncryptedNotes(BigInt(offset), SHIELDED_NOTES_PAGE_SIZE)

      if (page.length === 0) {
        break
      }

      notes.push(...page)
    }

    return notes
  }

  // Trial-decrypts a slice of the pool with the wallet's viewing key and returns
  // the notes that belong to it. `recoverNotes` numbers what it is given from
  // zero, so `start` turns that back into a global leaf position.
  recoverNotes (
    notes: ShieldedEncryptedNote[],
    start: number,
    seed: Uint8Array,
    account: number,
    network: NetworkType,
    diversifierIndexByAddress: Map<string, number>
  ): ShieldedCachedNote[] {
    return this.sdk.shielded.recoverNotes(notes, seed, account).map(recoveredNote => {
      const address = recoveredNote.note.address.toBech32m(network)

      return {
        index: start + recoveredNote.index,
        value: recoveredNote.note.value.toString(),
        address,
        diversifierIndex: diversifierIndexByAddress.get(address) ?? null,
        nullifier: bytesToHex(recoveredNoteNullifier(recoveredNote)),
        isSpent: false
      }
    })
  }

  // Asks the pool which of the cached notes have been spent since the last sync.
  // Only notes still believed unspent are queried: spending cannot be undone, so
  // a note once marked spent stays that way.
  async refreshSpentFlags (notes: ShieldedCachedNote[]): Promise<ShieldedCachedNote[]> {
    const unspent = notes.filter(note => !note.isSpent)

    if (unspent.length === 0) {
      return notes
    }

    const statuses = await getShieldedNullifierStatuses(this.sdk, unspent.map(note => hexToBytes(note.nullifier)))
    const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))

    return notes.map(note => note.isSpent || !spent.has(note.nullifier) ? note : { ...note, isSpent: true })
  }

  seed (wallet: Wallet, password: string): Uint8Array {
    return this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  }

  // The wallet's generated diversified addresses, used both to label notes and
  // to serve the cached address list to callers without a password.
  addresses (wallet: Wallet, password: string, account: number, count: number): ShieldedCachedAddress[] {
    if (count === 0) {
      return []
    }

    return deriveShieldedAddresses(wallet, password, account, count, this.sdk)
  }
}
