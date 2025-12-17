interface BaseDecodedStateTransition {
  type: number
  signaturePublicKeyId?: number
  signature?: string | null
  raw?: string
}

export interface DecodedBatchTransition extends BaseDecodedStateTransition {
  type: 1
  ownerId: string
  transitions: Array<{
    action: string
    tokenId?: string
    identityContractNonce?: string
    dataContractId?: string
    amount?: string
    recipientId?: string
    documentId?: string
    documentType?: string
    data?: Record<string, unknown>
  }>
}

export interface DecodedIdentityUpdateTransition extends BaseDecodedStateTransition {
  type: 5
  identityId: string
  revision: number
  identityNonce: string
  userFeeIncrease: number
  publicKeysToAdd?: Array<{
    id: number
    type: string
    purpose: string
    securityLevel: string
    readOnly: boolean
    data: string
    publicKeyHash: string
  }>
  publicKeyIdsToDisable?: number[]
}

export interface DecodedIdentityCreditTransferTransition extends BaseDecodedStateTransition {
  type: 7
  identityNonce: string
  userFeeIncrease: number
  senderId: string
  recipientId: string
  amount: string
}

export interface DecodedMasternodeVoteTransition extends BaseDecodedStateTransition {
  type: 8
  proTxHash: string
  choice: string
  towardsIdentity: string | null
  identityNonce: string
  userFeeIncrease: number
  modifiedDataIds: string[]
  indexValues: string[]
  contractId: string
  documentTypeName: string
  indexName: string
  ownerId: string
}

export type DecodedStateTransition =
  | DecodedBatchTransition
  | DecodedIdentityUpdateTransition
  | DecodedIdentityCreditTransferTransition
  | DecodedMasternodeVoteTransition
