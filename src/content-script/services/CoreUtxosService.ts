import { DashPlatformSDK } from 'dash-platform-sdk'
import { Wallet } from '../../types/Wallet'
import { NetworkType } from '../../types/PlatformExplorer'
import { CoreAddressChain } from '../../types/enums/CoreAddressChain'
import { CoreAddressEntry, deriveCoreAddressesFromXpub } from '../../utils/coreAddresses'
import { reconcilePendingSpends } from '../../utils/coreTransfer'
import { CoreExplorerService, CoreWalletUtxo } from './CoreExplorerService'
import { CorePendingSpendsRepository } from '../repository/CorePendingSpendsRepository'

export interface SpendableCoreUtxos {
  // What can really be spent now: the explorer's set minus the outputs a
  // just-broadcast transaction already consumed, plus the change it paid us.
  utxos: CoreWalletUtxo[]
  // Every address of the account the explorer has seen, plus the next free one
  // on each chain - the extent that counts as "this wallet's own".
  owned: Map<string, CoreAddressEntry>
  nextUnused: Record<CoreAddressChain, number>
  // Pending entries that no longer matter; the caller may forget them.
  resolvedTxids: string[]
}

/**
 * One answer to "what does this wallet have on L1 right now", shared by the
 * UTXO list, the balance and the send.
 *
 * The explorer only sees mined transactions, so a send made minutes ago is
 * missing from its view: it still offers the inputs that send consumed and hides
 * the change it produced. Correcting that in one place is what keeps the list,
 * the balance, the fee and the coin selection from disagreeing with each other.
 */
export class CoreUtxosService {
  sdk: DashPlatformSDK
  coreExplorer: CoreExplorerService
  corePendingSpendsRepository: CorePendingSpendsRepository

  constructor (sdk: DashPlatformSDK, coreExplorer: CoreExplorerService, corePendingSpendsRepository: CorePendingSpendsRepository) {
    this.sdk = sdk
    this.coreExplorer = coreExplorer
    this.corePendingSpendsRepository = corePendingSpendsRepository
  }

  // `addresses` narrows the read to some of the wallet's own addresses; without
  // it the whole account is read. An address the account does not derive is
  // refused: there is no key to sign its outputs with, so listing them could
  // only lead to a transaction nobody can sign.
  async spendable (wallet: Wallet, xpub: string, account: number = 0, addresses?: string[]): Promise<SpendableCoreUtxos> {
    const network = wallet.network as NetworkType
    const { nextUnused } = await this.coreExplorer.getXpubSummary(xpub, network)

    const owned = new Map<string, CoreAddressEntry>()

    for (const chain of [CoreAddressChain.receiving, CoreAddressChain.change]) {
      for (const entry of deriveCoreAddressesFromXpub(this.sdk, xpub, wallet.network, account, chain, nextUnused[chain] + 1)) {
        owned.set(entry.address, entry)
      }
    }

    for (const address of addresses ?? []) {
      if (!owned.has(address)) {
        throw new Error('Source address not found in this wallet')
      }
    }

    const asked = addresses ?? [...owned.keys()]
    const explorerUtxos = await this.coreExplorer.getAddressesUtxos(asked, network)

    const pending = await this.corePendingSpendsRepository.getAll()
    const { candidates, resolvedTxids } = reconcilePendingSpends(explorerUtxos, pending, Date.now())

    // An output the explorer could not attribute to one of the addresses we
    // asked about has no key to sign it, and must not reach coin selection.
    const askedSet = new Set(asked)

    return {
      utxos: candidates.filter(utxo => askedSet.has(utxo.address)),
      owned,
      nextUnused,
      resolvedTxids
    }
  }

  // Sum of what can be spent now. Differs from the explorer's balance while a
  // send of ours is still waiting for its block.
  async availableDuffs (wallet: Wallet, xpub: string, account: number = 0): Promise<bigint> {
    const { utxos } = await this.spendable(wallet, xpub, account)

    return utxos.reduce((sum, utxo) => sum + utxo.amount, 0n)
  }
}
