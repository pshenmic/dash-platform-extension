import { RepositoryScope } from '../../RepositoryScope'

export interface ExecuteIdentityFundingPayload extends RepositoryScope {
  operationId: string
  password: string
}
