interface BaseDecodedStateTransition {
  type: number
  typeString: string
  signaturePublicKeyId?: number
  signature?: string | null
  raw?: string
}

export interface DecodedBatchTransition extends BaseDecodedStateTransition {
  type: 1
  typeString: 'BATCH'
  ownerId: string
  transitions: Array<{
    action: string
    tokenId?: string
    identityContractNonce?: string
    tokenContractPosition?: number
    dataContractId?: string
    historicalDocumentTypeName?: string
    historicalDocumentId?: string
    amount?: string
    recipientId?: string
    documentId?: string
    documentType?: string
    data?: Record<string, unknown>
  }>
}

export interface DecodedIdentityCreateTransition extends BaseDecodedStateTransition {
  type: 2
  typeString: 'IDENTITY_CREATE'
  identityId: string
  publicKeys: Array<{
    id: number
    type: string
    purpose: string
    securityLevel: string
    readOnly: boolean
    data: string
    publicKeyHash: string
  }>
}

export interface DecodedIdentityTopUpTransition extends BaseDecodedStateTransition {
  type: 3
  typeString: 'IDENTITY_TOP_UP'
  identityId: string
  amount: string
}

export interface DecodedIdentityUpdateTransition extends BaseDecodedStateTransition {
  type: 5
  typeString: 'IDENTITY_UPDATE'
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
  typeString: 'IDENTITY_CREDIT_TRANSFER'
  identityNonce: string
  userFeeIncrease: number
  senderId: string
  recipientId: string
  amount: string
}

export interface DecodedMasternodeVoteTransition extends BaseDecodedStateTransition {
  type: 8
  typeString: 'MASTERNODE_VOTE'
  proTxHash: string
  choice: string
  towardsIdentity: string | null
  identityNonce: string
  userFeeIncrease: number
  modifiedDataIds?: string[]
  indexValues?: string[]
  contractId?: string
  documentTypeName?: string
  indexName?: string
  ownerId?: string
}

export type DecodedStateTransition =
  | DecodedBatchTransition
  | DecodedIdentityCreateTransition
  | DecodedIdentityTopUpTransition
  | DecodedIdentityUpdateTransition
  | DecodedIdentityCreditTransferTransition
  | DecodedMasternodeVoteTransition
