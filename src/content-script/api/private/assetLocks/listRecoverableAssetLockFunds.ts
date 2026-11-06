import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { ListRecoverableAssetLockFundsPayload } from '../../../../types/messages/payloads/ListRecoverableAssetLockFundsPayload'
import {
  ListRecoverableAssetLockFundsResponse,
  RecoverableAssetLockFundingAddress
} from '../../../../types/messages/response/ListRecoverableAssetLockFundsResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'

// Asset lock funding addresses this wallet was given and never finished with:
// money a user sent to an address the extension handed out during a registration
// that did not complete.
//
// These deposits are invisible everywhere else. LIST_PENDING_ASSET_LOCKS reports
// what the extension itself paid, because that is what writes `fundingTxid`; a
// deposit sent from an outside wallet leaves no such record, so the address reads
// as merely unused. Only the chain knows the money is there.
//
// Balances are optional and off by default. The settings menu calls this to decide
// whether to show an entry at all, and must not fire an explorer request per
// address every time it opens.
export class ListRecoverableAssetLockFundsHandler implements APIHandler {
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

  async handle (event: EventData): Promise<ListRecoverableAssetLockFundsResponse> {
    const payload: ListRecoverableAssetLockFundsPayload = event.payload ?? {}
    const scope = await this.resolveScope(payload)
    const repository = this.assetLockFundingAddressesRepository.forScope(scope)

    const entries = await repository.findAllRecoverable()

    if (payload.withBalances !== true) {
      return { addresses: entries.map(entry => this.describe(entry, null, null)) }
    }

    // Read every address, but let one the explorer cannot answer fail the whole
    // listing rather than report a balance of zero: an address that reads as
    // empty is one the user would be told has nothing to recover.
    const addresses: RecoverableAssetLockFundingAddress[] = []

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
  ): RecoverableAssetLockFundingAddress {
    return {
      address: entry.address,
      purpose: entry.purpose ?? 'registration',
      balanceDuffs,
      utxoCount,
      // The funding key was a one-time random key, never derived from the seed,
      // so an entry that carries no key has no way to be spent.
      hasKey: typeof entry.encryptedPrivateKey === 'string' && entry.encryptedPrivateKey.length > 0,
      identityId: entry.identityId ?? null,
      recipient: entry.recipient ?? null
    }
  }

  private async resolveScope (payload: ListRecoverableAssetLockFundsPayload): Promise<RepositoryScope> {
    if (payload.walletId != null && payload.network != null) {
      return { network: payload.network, walletId: payload.walletId }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    return { network: wallet.network, walletId: wallet.walletId }
  }

  validatePayload (payload: ListRecoverableAssetLockFundsPayload): string | null {
    if (payload?.withBalances != null && typeof payload.withBalances !== 'boolean') {
      return 'withBalances must be a boolean'
    }

    return validateRepositoryScopePayload(payload ?? {})
  }
}
