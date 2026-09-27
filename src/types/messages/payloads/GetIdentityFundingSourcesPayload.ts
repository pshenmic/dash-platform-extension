import { RepositoryScope } from '../../RepositoryScope'

export interface GetIdentityFundingSourcesPayload extends RepositoryScope {
  // Optional: with it the shielded balance is read too, since recovering the
  // wallet's notes needs the viewing key.
  password?: string
}
