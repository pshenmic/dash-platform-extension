import {DashPlatformProtocolWASM, IdentityPublicKeyWASM, PrivateKeyWASM} from "pshenmic-dpp";

export interface KeyPair {
    identityPublicKey: IdentityPublicKeyWASM
    privateKey?: PrivateKeyWASM
}
