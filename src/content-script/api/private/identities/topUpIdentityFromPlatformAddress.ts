import { ExecuteIdentityFundingHandler } from './executeIdentityFunding'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'

// Confirms a top-up quoted against one of the wallet's Platform addresses: the
// transition was signed at quote time, so this only broadcasts it and waits for
// Platform to credit the identity.
export class TopUpIdentityFromPlatformAddressHandler extends ExecuteIdentityFundingHandler {
  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    super(walletRepository, service, 'platform', 'topUp')
  }
}
