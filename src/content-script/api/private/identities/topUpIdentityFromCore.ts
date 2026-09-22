import { ExecuteIdentityFundingHandler } from './executeIdentityFunding'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'

export class TopUpIdentityFromCoreHandler extends ExecuteIdentityFundingHandler {
  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    super(walletRepository, service, 'core', 'topUp')
  }
}
