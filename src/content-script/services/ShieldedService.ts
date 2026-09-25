import { DashPlatformSDK } from 'dash-platform-sdk'
import { ShieldedEncryptedNote, ShieldedNullifierStatus } from 'dash-platform-sdk/types'
import { OrchardAddressWASM, RecoveredNoteWASM, SpendableNoteWASM } from 'pshenmic-dpp'
import { StorageAdapter } from '../storage/storageAdapter'
import { ShieldedNotesRepository } from '../repository/ShieldedNotesRepository'
import { RepositoryScope } from '../../types/RepositoryScope'
import { Wallet } from '../../types/Wallet'
import { NetworkType } from '../../types/NetworkType'
import { ShieldedAddressBalance, ShieldedNote, ShieldedNotesAccount, ShieldedStoredAddress, ShieldedSyncPhase } from '../../types/ShieldedNotes'
import { Network } from '../../types/enums/Network'
import { ShieldedSpendKind } from '../../types/ShieldedSpendKind'
import { PLATFORM_ADDRESS_COIN_TYPE, SHIELDED_NOTES_PAGE_SIZE, SHIELDED_NULLIFIER_QUERY_LIMIT } from '../../constants'
import { ShieldedSyncState } from '../../types/messages/response/GetShieldedSyncStateResponse'
import { bytesToHex, decryptMnemonic, hexToBytes, selectShieldedNotes } from '../../utils'

// What every network-bound copy of the service shares: one SDK per extra network
// and the in-memory sync phases.
export interface ShieldedServiceShared {
  sdks: Map<NetworkType, DashPlatformSDK>
  phases: Map<string, ShieldedSyncPhase>
}

interface RawRecoveredNoteWithNullifier {
  _rawRecoveredNote: { nullifier: Uint8Array }
}

export interface UnspentShieldedNotes {
  // The whole note set: witnessing the selected notes needs it.
  allNotes: ShieldedEncryptedNote[]
  unspent: RecoveredNoteWASM[]
}

export interface ShieldedSpendInputs {
  spends: SpendableNoteWASM[]
  anchor: Uint8Array
  changeAddress: OrchardAddressWASM
  coinType: number
}

// Domain primitives for the shielded (Orchard) pool: reading it, recovering this
// wallet's notes out of it, re-checking what has been spent and shaping what is
// stored. The handlers decide when each one runs.
export class ShieldedService {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  shared: ShieldedServiceShared

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK, shared?: ShieldedServiceShared) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
    this.shared = shared ?? { sdks: new Map(), phases: new Map() }
  }

  // A service reading the pool of `network`. The extension's own SDK follows the
  // selected network, so any other network gets its own instance, created once and
  // shared by every copy of this service. Sync phases are shared too, so a phase
  // set while syncing one network is visible through the base instance.
  forNetwork (network: NetworkType): ShieldedService {
    if (this.sdk.getNetwork() === network) {
      return this
    }

    let sdk = this.shared.sdks.get(network)

    if (sdk == null) {
      sdk = new DashPlatformSDK({ network: Network[network] })
      this.shared.sdks.set(network, sdk)
    }

    return new ShieldedService(this.storageAdapter, sdk, this.shared)
  }

  // Where a wallet's sync stands. Kept in memory: a restarted backend reports
  // 'idle', which is also what it is.
  getPhase (network: string, walletId: string, account: number): ShieldedSyncPhase {
    return this.shared.phases.get(`${network}_${walletId}_${account}`) ?? 'idle'
  }

  setPhase (network: string, walletId: string, account: number, phase: ShieldedSyncPhase): void {
    this.shared.phases.set(`${network}_${walletId}_${account}`, phase)
  }

  repository (scope?: RepositoryScope): ShieldedNotesRepository {
    const repository = new ShieldedNotesRepository(this.storageAdapter)

    return scope != null ? repository.forScope(scope) : repository
  }

  // Number of notes (commitment-tree leaves) the pool holds right now.
  async getPoolTotal (): Promise<number> {
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

  // The whole note set, in leaf order. Spends need it: witnessing the notes they
  // select happens against the full tree.
  async fetchAllNotes (): Promise<ShieldedEncryptedNote[]> {
    const total = await this.getPoolTotal()

    return total === 0 ? [] : await this.fetchNotesFrom(0, total)
  }

  // The wallet's own notes inside `notes`, as the SDK returns them. Spends work
  // with these objects; `recoverNotes` below is the storage-shaped view.
  recoverOwnNotes (notes: ShieldedEncryptedNote[], seed: Uint8Array, account: number): RecoveredNoteWASM[] {
    return this.sdk.shielded.recoverNotes(notes, seed, account)
  }

  // Spent status for any number of nullifiers. Platform caps a single
  // getShieldedNullifiers query at SHIELDED_NULLIFIER_QUERY_LIMIT and rejects the
  // whole request past it, so a wallet holding more notes than that could neither
  // read its balance nor spend. Queries in consecutive chunks, each with its own
  // verified proof. Results are matched by nullifier bytes downstream, never by
  // position, so concatenating the chunks is safe.
  async nullifierStatuses (nullifiers: Uint8Array[]): Promise<ShieldedNullifierStatus[]> {
    const statuses: ShieldedNullifierStatus[] = []

    for (let offset = 0; offset < nullifiers.length; offset += SHIELDED_NULLIFIER_QUERY_LIMIT) {
      const chunk = nullifiers.slice(offset, offset + SHIELDED_NULLIFIER_QUERY_LIMIT)

      statuses.push(...await this.sdk.shielded.getShieldedNullifiers(chunk))
    }

    return statuses
  }

  // The nullifier of a recovered note as derived from the wallet's viewing key —
  // the value to check against getShieldedNullifiers to tell whether THIS note has
  // been spent. NOT the action leaf's nullifier (`ShieldedEncryptedNote.nullifier`),
  // which belongs to whatever note that action spent, i.e. someone else's.
  //
  // STOPGAP: the SDK's RecoveredNoteWASM wrapper does not expose this yet (only
  // `index` / `note`), so we reach into the raw NAPI. TODO: drop the cast once
  // dash-platform-sdk / pshenmic-dpp add a public RecoveredNoteWASM.nullifier
  // getter.
  noteNullifier (recoveredNote: RecoveredNoteWASM): Uint8Array {
    return (recoveredNote as unknown as RawRecoveredNoteWithNullifier)._rawRecoveredNote.nullifier
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
  ): ShieldedNote[] {
    return this.sdk.shielded.recoverNotes(notes, seed, account).map(recoveredNote => {
      const address = recoveredNote.note.address.toBech32m(network)

      return {
        index: start + recoveredNote.index,
        value: recoveredNote.note.value.toString(),
        address,
        diversifierIndex: diversifierIndexByAddress.get(address) ?? null,
        nullifier: bytesToHex(this.noteNullifier(recoveredNote)),
        isSpent: false
      }
    })
  }

  // Asks the pool which of the stored notes have been spent since the last sync.
  // Only notes still believed unspent are queried: spending cannot be undone, so
  // a note once marked spent stays that way.
  async refreshSpentFlags (notes: ShieldedNote[]): Promise<ShieldedNote[]> {
    const unspent = notes.filter(note => !note.isSpent)

    if (unspent.length === 0) {
      return notes
    }

    const statuses = await this.nullifierStatuses(unspent.map(note => hexToBytes(note.nullifier)))
    const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))

    return notes.map(note => note.isSpent || !spent.has(note.nullifier) ? note : { ...note, isSpent: true })
  }

  deriveSeed (wallet: Wallet, password: string): Uint8Array {
    return this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  }

  // `count` diversified Orchard addresses of an account, from diversifier index
  // `start`. ZIP-32 m/32'/coinType'/account'; each index yields a distinct
  // receiving address sharing the account's viewing key. Needs the password.
  deriveAddresses (wallet: Wallet, password: string, account: number, count: number, start: number = 0): ShieldedStoredAddress[] {
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded addresses can only be derived from a seedphrase wallet')
    }

    const networkType = wallet.network
    const network = Network[networkType as keyof typeof Network]
    const seed = this.deriveSeed(wallet, password)
    const coinType = PLATFORM_ADDRESS_COIN_TYPE[networkType]
    const derivationPath = `m/32'/${coinType}'/${account}'`

    const entries: ShieldedStoredAddress[] = []
    for (let diversifierIndex = start; diversifierIndex < start + count; diversifierIndex++) {
      const orchardAddress = this.sdk.keyPair.deriveShieldedAddress(seed, network, account, diversifierIndex)
      entries.push({ address: orchardAddress.toBech32m(networkType), derivationPath, diversifierIndex })
    }

    return entries
  }

  // Sums the recovered notes that are not spent, in aggregate and grouped by the
  // diversified address that received each one. Spent status is matched by
  // nullifier hex, never by array order: getShieldedNullifiers does not promise
  // to answer in the order it was asked.
  sumUnspentValue (
    recovered: RecoveredNoteWASM[],
    statuses: ShieldedNullifierStatus[],
    network: NetworkType,
    diversifierIndexByAddress: Map<string, number> = new Map()
  ): { balance: bigint, spendableNotes: number, byAddress: ShieldedAddressBalance[] } {
    const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))

    let balance = 0n
    let spendableNotes = 0
    const buckets = new Map<string, { balance: bigint, spendableNotes: number }>()

    for (const recoveredNote of recovered) {
      if (spent.has(bytesToHex(this.noteNullifier(recoveredNote)))) {
        continue
      }

      const value = recoveredNote.note.value
      balance += value
      spendableNotes += 1

      const address = recoveredNote.note.address.toBech32m(network)
      const bucket = buckets.get(address) ?? { balance: 0n, spendableNotes: 0 }
      bucket.balance += value
      bucket.spendableNotes += 1
      buckets.set(address, bucket)
    }

    const byAddress: ShieldedAddressBalance[] = Array.from(buckets.entries()).map(([address, bucket]) => ({
      address,
      diversifierIndex: diversifierIndexByAddress.get(address) ?? null,
      balance: bucket.balance,
      spendableNotes: bucket.spendableNotes
    }))

    return { balance, spendableNotes, byAddress }
  }

  // Narrows recovered notes to those received on one of `fromAddresses`, so a
  // spend can draw only from specific source shielded addresses.
  filterNotesByAddress (notes: RecoveredNoteWASM[], fromAddresses: string[], network: NetworkType): RecoveredNoteWASM[] {
    const wanted = new Set(fromAddresses)

    return notes.filter(recoveredNote => wanted.has(recoveredNote.note.address.toBech32m(network)))
  }

  // Reads the pool, recovers this wallet's notes and keeps the unspent ones.
  // `fromAddresses` restricts them to those source addresses.
  async loadUnspentNotes (seed: Uint8Array, network: NetworkType, account: number, fromAddresses?: string[]): Promise<UnspentShieldedNotes> {
    const allNotes = await this.fetchAllNotes()
    const recovered = this.recoverOwnNotes(allNotes, seed, account)

    if (recovered.length === 0) {
      throw new Error('No shielded notes available to spend')
    }

    // Drop already-spent notes so they never enter a spend, matching how the
    // balance is computed. Uses each note's own nullifier, not the action leaf's,
    // so a note we already spent is excluded instead of being reselected and
    // rejected on-chain.
    const statuses = await this.nullifierStatuses(recovered.map(note => this.noteNullifier(note)))
    const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))
    const unspent = recovered.filter(note => !spent.has(bytesToHex(this.noteNullifier(note))))

    if (unspent.length === 0) {
      throw new Error('No unspent shielded notes available to spend')
    }

    const scoped = fromAddresses != null && fromAddresses.length > 0
      ? this.filterNotesByAddress(unspent, fromAddresses, network)
      : unspent

    if (scoped.length === 0) {
      throw new Error('No unspent shielded notes on the selected source address(es)')
    }

    return { allNotes, unspent: scoped }
  }

  // The shared inputs of any shielded spend (transfer / unshield / withdrawal):
  // the unspent notes, the minimal set covering `amountCredits` plus the fee this
  // `kind` is charged, those notes witnessed against the commitment tree, and the
  // change address. The Halo2 builder is not touched here — proving happens in the
  // createStateTransition call the handler makes with these inputs.
  async prepareSpend (seed: Uint8Array, network: NetworkType, account: number, amountCredits: bigint, kind: ShieldedSpendKind, fromAddresses?: string[]): Promise<ShieldedSpendInputs> {
    const { allNotes, unspent } = await this.loadUnspentNotes(seed, network, account, fromAddresses)

    const { notes: selected } = selectShieldedNotes(unspent, amountCredits, kind)
    const { spends, anchor } = this.sdk.shielded.buildSpendableNotes(allNotes, selected)
    const changeAddress = this.sdk.keyPair.deriveShieldedAddress(seed, network, account)

    return { spends, anchor, changeAddress, coinType: PLATFORM_ADDRESS_COIN_TYPE[network] }
  }

  // An account with nothing stored yet: the shape callers get before the first
  // sync, so a UI never has to special-case a missing wallet.
  emptyAccount (account: number): ShieldedNotesAccount {
    return { account, addresses: [], notes: [], fetched: 0, total: 0, updatedAt: 0 }
  }

  // The stored account as callers see it, summing the notes still unspent.
  syncState (wallet: { walletId: string, network: string }, stored: ShieldedNotesAccount, synced: boolean): ShieldedSyncState {
    const unspent = stored.notes.filter(note => !note.isSpent)

    return {
      walletId: wallet.walletId,
      network: wallet.network,
      account: stored.account,
      phase: this.getPhase(wallet.network, wallet.walletId, stored.account),
      balance: unspent.reduce((total, note) => total + BigInt(note.value), 0n).toString(),
      spendableNotes: unspent.length,
      addresses: stored.addresses,
      notes: stored.notes,
      fetched: stored.fetched,
      total: stored.total,
      updatedAt: synced ? stored.updatedAt : null
    }
  }

  // Re-checks the stored notes against the nullifier index and re-reads the pool
  // size. Needs no password: nothing is trial-decrypted, so notes that appeared
  // since the last sync are counted in `total` but not recovered.
  async refreshStored (stored: ShieldedNotesAccount): Promise<ShieldedNotesAccount> {
    return {
      ...stored,
      notes: await this.refreshSpentFlags(stored.notes),
      total: await this.getPoolTotal(),
      updatedAt: Date.now()
    }
  }

  validateAccount (account?: number): string | null {
    if (account != null && (!Number.isInteger(account) || account < 0)) {
      return 'Account must be a non-negative integer'
    }

    return null
  }
}
