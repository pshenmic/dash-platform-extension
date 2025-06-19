import { IdentityPublicKeyWASM } from 'pshenmic-dpp'

export interface KeyPair {
  identityPublicKey: IdentityPublicKeyWASM
  encryptedPrivateKey?: string
}
