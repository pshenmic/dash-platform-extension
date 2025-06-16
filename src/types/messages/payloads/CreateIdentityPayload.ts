export interface CreateIdentityPayload {
    index: number,
    identifier: string,
    identityPublicKeys: string[]
    privateKeys?: string[]
}
