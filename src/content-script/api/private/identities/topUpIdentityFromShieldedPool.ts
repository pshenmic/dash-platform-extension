import { ExecuteIdentityFundingHandler } from './executeIdentityFunding'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingService } from '../../../services/IdentityFundingService'

// Confirms a top-up funded from the shielded pool. The pool cannot credit an
// identity itself, so this drives both stages: the proved pool exit onto the
// wallet's own Platform address, then the top-up from that address. A resumed
// operation continues at whichever stage it stopped on, and never leaves the pool
// twice.
export class TopUpIdentityFromShieldedPoolHandler extends ExecuteIdentityFundingHandler {
  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    super(walletRepository, service, 'shielded', 'topUp')
  }
}
