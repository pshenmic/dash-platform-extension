import { DashCoreSDK } from 'dash-core-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { DiscardAssetLockFundingPayload } from '../../../../types/messages/payloads/DiscardAssetLockFundingPayload'
import { DiscardAssetLockFundingResponse } from '../../../../types/messages/response/DiscardAssetLockFundingResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { findConflictingSpend } from '../../../../utils/conflictingSpend'

// Forgets a funding payment the network never took, so the operation can pay
// its address again.
//
// Only for an operation stuck on a record written before the signed payment was
// kept: there are no bytes to send again, and the recorded transaction is
// nowhere to be found. Everything newer re-sends its own payment and never
// needs this.
//
// Deliberately a call of its own rather than something a retry decides by
// itself. "No node has it" is not the same as "it was never broadcast": a
// transaction can sit in a mempool this node has not seen, and paying the
// address a second time would leave two deposits on an address whose asset lock
// spends one of them. So the facts are checked here, and the decision belongs to
// whoever asked.
export class DiscardAssetLockFundingHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  coreExplorer: CoreExplorerService
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    coreExplorer: CoreExplorerService,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.coreExplorer = coreExplorer
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<DiscardAssetLockFundingResponse> {
    const payload: DiscardAssetLockFundingPayload = event.payload
    const scope = await this.resolveScope(payload)
    const repository = this.assetLockFundingAddressesRepository.forScope(scope)

    const entry = await repository.getByAddress(payload.fundingAddress)

    if (entry == null) {
      throw new Error(`Asset lock funding address ${payload.fundingAddress} is not known on ${scope.network}`)
    }

    if (entry.fundingTxid == null) {
      throw new Error(`Asset lock funding address ${payload.fundingAddress} has no recorded payment to discard`)
    }

    if (entry.fundingTxHex != null) {
      // A kept payment is normally re-sent rather than discarded. Unless another
      // transaction has taken one of its inputs: then it can never confirm, and
      // re-sending it forever is the only thing repeating the operation would
      // achieve.
      const conflict = await findConflictingSpend(
        this.coreExplorer, entry.fundingTxid, entry.fundingTxHex, scope.network
      )

      if (conflict == null) {
        throw new Error(
          `Funding payment ${entry.fundingTxid} is kept as a signed transaction and can be sent again, ` +
          'so repeat the operation instead of discarding its payment'
        )
      }

      await repository.clearFunding(payload.fundingAddress)

      return {
        fundingAddress: payload.fundingAddress,
        fundingTxid: entry.fundingTxid,
        amountDuffs: entry.fundedAmountDuffs ?? null
      }
    }

    // A node that answers is the authority on its own mempool, so finding the
    // transaction settles it: the money is on its way and the operation has to
    // be finished, not restarted.
    if (await this.coreSDK.getTransaction(entry.fundingTxid).then(() => true, () => false)) {
      throw new Error(
        `Funding payment ${entry.fundingTxid} is on the network, so the operation can be finished - ` +
        'repeat it with the same recipient instead of discarding its payment'
      )
    }

    // Raises rather than answering when it cannot look, which is what keeps a
    // broken explorer from reading as "the payment never happened".
    if (await this.coreExplorer.hasTransaction(entry.fundingTxid, scope.network)) {
      throw new Error(
        `Funding payment ${entry.fundingTxid} is indexed by the explorer, so the operation can be finished - ` +
        'repeat it with the same recipient instead of discarding its payment'
      )
    }

    await repository.clearFunding(payload.fundingAddress)

    return {
      fundingAddress: payload.fundingAddress,
      fundingTxid: entry.fundingTxid,
      amountDuffs: entry.fundedAmountDuffs ?? null
    }
  }

  private async resolveScope (payload: DiscardAssetLockFundingPayload): Promise<RepositoryScope> {
    if (payload.walletId != null && payload.network != null) {
      return { network: payload.network, walletId: payload.walletId }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    return { network: wallet.network, walletId: wallet.walletId }
  }

  validatePayload (payload: DiscardAssetLockFundingPayload): string | null {
    if (typeof payload.fundingAddress !== 'string' || payload.fundingAddress.length === 0) {
      return 'fundingAddress must be a non-empty string'
    }

    return validateRepositoryScopePayload(payload)
  }
}
