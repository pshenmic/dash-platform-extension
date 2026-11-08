import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { ClearAssetLockFundingAddressesResponse } from '../../../../types/messages/response/ClearAssetLockFundingAddressesResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { ScopedPayload, validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { NetworkType } from '../../../../types/PlatformExplorer'

/**
 * Deletes every asset lock funding address this wallet holds, so the recovery
 * entry stops being offered.
 *
 * This destroys the only copy of the funding keys. They were one-time random keys,
 * never derived from the seed, so an address cleared here can never be spent
 * again - not by this extension, not by importing the seed anywhere else. That
 * makes it the one operation in this feature with no undo, so it refuses unless
 * every address is provably inert:
 *
 *  1. nothing recoverable - an unspent, uncommitted entry is exactly what the
 *     recovery screen exists to spend, and it is still listed there;
 *  2. no asset lock left unfinished - an entry carrying an `assetLockTxid` but not
 *     marked used has money committed on L1, and `registrationIdentityIndex` in
 *     this same record is what lets `registerIdentity` rebuild that exact
 *     transaction. Deleting it strands a registration that could still finish;
 *  3. no unspent output on chain for any address, including spent-looking ones.
 *     The local record says what this extension did, not what the network holds:
 *     a deposit can arrive at an address long after the operation that reserved
 *     it was abandoned.
 */
export class ClearAssetLockFundingAddressesHandler implements APIHandler {
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

  async handle (event: EventData): Promise<ClearAssetLockFundingAddressesResponse> {
    const payload: ScopedPayload = event.payload ?? {}
    const scope = await this.resolveScope(payload)
    const repository = this.assetLockFundingAddressesRepository.forScope(scope)

    const entries = await repository.findAll()

    if (entries.length === 0) {
      return { cleared: 0 }
    }

    const recoverable = entries.filter(entry => !entry.used && entry.assetLockTxid == null)

    if (recoverable.length > 0) {
      throw new Error(
        `${recoverable.length} funding address${recoverable.length === 1 ? '' : 'es'} still ` +
        `${recoverable.length === 1 ? 'has' : 'have'} a deposit to recover ` +
        `(${recoverable.map(entry => entry.address).join(', ')}). Recover or spend ` +
        `${recoverable.length === 1 ? 'it' : 'them'} first`
      )
    }

    const unfinished = entries.filter(entry => !entry.used && entry.assetLockTxid != null)

    if (unfinished.length > 0) {
      throw new Error(
        `${unfinished.length} funding address${unfinished.length === 1 ? '' : 'es'} ` +
        `${unfinished.length === 1 ? 'has' : 'have'} an asset lock on L1 whose registration never finished ` +
        `(${unfinished.map(entry => entry.address).join(', ')}). Clearing it would discard the ` +
        'identity index needed to rebuild that transaction and strand the deposit'
      )
    }

    // The local record cannot say what the chain holds, so ask. An explorer that
    // cannot answer raises rather than reporting an empty balance, which is what
    // keeps a network failure from reading as "nothing left to lose".
    const funded: string[] = []

    for (const entry of entries) {
      const utxos = await this.coreExplorer.getAddressUtxos(entry.address, scope.network as NetworkType)

      if (utxos.some(utxo => utxo.amount > 0n)) {
        funded.push(entry.address)
      }
    }

    if (funded.length > 0) {
      throw new Error(
        `${funded.length} funding address${funded.length === 1 ? '' : 'es'} still ` +
        `${funded.length === 1 ? 'holds' : 'hold'} unspent funds on ${scope.network} ` +
        `(${funded.join(', ')}), so clearing ${funded.length === 1 ? 'it' : 'them'} would destroy ` +
        'the only key that can spend it'
      )
    }

    return { cleared: await repository.clearAll() }
  }

  private async resolveScope (payload: ScopedPayload): Promise<RepositoryScope> {
    if (payload.walletId != null && payload.network != null) {
      return { network: payload.network, walletId: payload.walletId }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    return { network: wallet.network, walletId: wallet.walletId }
  }

  validatePayload (payload: ScopedPayload): string | null {
    return validateRepositoryScopePayload(payload ?? {})
  }
}
