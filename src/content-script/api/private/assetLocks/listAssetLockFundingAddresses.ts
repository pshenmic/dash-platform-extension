import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { ListAssetLockFundingAddressesPayload } from '../../../../types/messages/payloads/ListAssetLockFundingAddressesPayload'
import {
  AssetLockFundingAddressInfo,
  AssetLockFundingAddressState,
  ListAssetLockFundingAddressesResponse
} from '../../../../types/messages/response/ListAssetLockFundingAddressesResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'

// Every asset lock funding address this wallet was ever given, with where each one
// stands.
//
// All of them, not only the ones with money to sweep. These entries carry the only
// copy of a one-time funding key - not derivable from the seed - and the screen
// offers a button that deletes them, so the user has to be able to see everything
// that button would remove before it is offered. Listing only the recoverable ones
// hid the rest behind an irreversible action.
//
// These deposits are invisible everywhere else too. LIST_PENDING_ASSET_LOCKS
// reports what the extension itself paid, because that is what writes
// `fundingTxid`; a deposit sent from an outside wallet leaves no such record, so
// only the chain knows the money is there.
export class ListAssetLockFundingAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  coreExplorer: CoreExplorerService

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    coreExplorer: CoreExplorerService
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.coreExplorer = coreExplorer
  }

  async handle (event: EventData): Promise<ListAssetLockFundingAddressesResponse> {
    const payload: ListAssetLockFundingAddressesPayload = event.payload ?? {}
    const scope = await this.resolveScope(payload)
    const repository = this.assetLockFundingAddressesRepository.forScope(scope)

    const entries = await repository.findAll()

    if (payload.withBalances !== true) {
      return { addresses: entries.map(entry => this.describe(entry, null, null)) }
    }

    // Read every address, spent ones included: a zero next to a spent entry is
    // what tells the user there is nothing left there to lose. Let one the
    // explorer cannot answer fail the whole listing rather than report a balance
    // of zero - an address that reads as empty is one the user would be told has
    // nothing on it.
    const addresses: AssetLockFundingAddressInfo[] = []

    for (const entry of entries) {
      const utxos = await this.coreExplorer.getAddressUtxos(entry.address, scope.network as NetworkType)
      const balance = utxos.reduce((sum, utxo) => sum + utxo.amount, 0n)

      addresses.push(this.describe(entry, balance.toString(), utxos.length))
    }

    return { addresses }
  }

  private describe (
    entry: AssetLockFundingAddressSchema,
    balanceDuffs: string | null,
    utxoCount: number | null
  ): AssetLockFundingAddressInfo {
    return {
      address: entry.address,
      purpose: entry.purpose ?? 'registration',
      state: this.stateOf(entry),
      balanceDuffs,
      utxoCount,
      // The funding key was a one-time random key, never derived from the seed,
      // so an entry that carries no key has no way to be spent.
      hasKey: typeof entry.encryptedPrivateKey === 'string' && entry.encryptedPrivateKey.length > 0,
      identityId: entry.identityId ?? null,
      recipient: entry.recipient ?? null,
      assetLockTxid: entry.assetLockTxid ?? null
    }
  }

  private stateOf (entry: AssetLockFundingAddressSchema): AssetLockFundingAddressState {
    if (entry.used) {
      return 'spent'
    }

    // Not used, but an asset lock already spends it: the deposit is on L1 and the
    // operation that built that asset lock never finished.
    if (entry.assetLockTxid != null) {
      return 'committed'
    }

    return 'recoverable'
  }

  private async resolveScope (payload: ListAssetLockFundingAddressesPayload): Promise<RepositoryScope> {
    if (payload.walletId != null && payload.network != null) {
      return { network: payload.network, walletId: payload.walletId }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    return { network: wallet.network, walletId: wallet.walletId }
  }

  validatePayload (payload: ListAssetLockFundingAddressesPayload): string | null {
    if (payload?.withBalances != null && typeof payload.withBalances !== 'boolean') {
      return 'withBalances must be a boolean'
    }

    return validateRepositoryScopePayload(payload ?? {})
  }
}
