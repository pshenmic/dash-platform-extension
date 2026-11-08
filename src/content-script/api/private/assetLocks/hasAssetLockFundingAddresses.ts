import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { HasAssetLockFundingAddressesResponse } from '../../../../types/messages/response/HasAssetLockFundingAddressesResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { ScopedPayload, validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'

// Whether this wallet was ever handed an asset lock funding address, spent or not.
//
// The settings menu asks this to decide whether to offer recovery at all. It is
// the cheap half of LIST_ASSET_LOCK_FUNDING_ADDRESSES: same storage, but a single
// boolean instead of a row per address, because the menu opens often and must not
// pay for a listing it is not going to render. Storage only - it must not touch
// the network to answer.
export class HasAssetLockFundingAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
  }

  async handle (event: EventData): Promise<HasAssetLockFundingAddressesResponse> {
    const payload: ScopedPayload = event.payload ?? {}
    const scope = await this.resolveScope(payload)

    return {
      hasAny: await this.assetLockFundingAddressesRepository.forScope(scope).hasAny()
    }
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
