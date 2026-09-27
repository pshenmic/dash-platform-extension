import { ExecuteIdentityFundingHandler } from './executeIdentityFunding'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'

// Confirms a registration quoted against the shielded pool. The proof was built
// when the quote was prepared, so this only broadcasts the transition and waits
// for Platform to create the identity.
export class RegisterIdentityFromShieldedPoolHandler extends ExecuteIdentityFundingHandler {
  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    super(walletRepository, service, 'shielded', 'registration')
  }
}
