import { RepositoryScope } from '../../RepositoryScope'
import { IdentityFundingSource } from '../../IdentityFundingOperation'

export interface PrepareIdentityFundingPayload extends RepositoryScope {
  // chosen by the caller; preparing again with the same id returns the saved quote
  operationId: string
  kind: 'registration' | 'topUp'
  source: IdentityFundingSource
  // credits as a string (bigint does not serialize across messaging)
  amountCredits: string
  password: string
  // the identity to top up; not accepted for a registration
  identityId?: string
}
