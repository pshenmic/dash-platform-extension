import { IdentityPublicKeyWASM } from 'pshenmic-dpp'

export interface Identity {
  index: number
  identifier: string
  label: string | null
  identityPublicKeys: IdentityPublicKeyWASM[]
}
