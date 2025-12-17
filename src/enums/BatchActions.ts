// Document Action Enum (maps directly to WASM document action numbers 0-5)
export enum DocumentActionEnum {
  DOCUMENT_CREATE = 0,
  DOCUMENT_REPLACE = 1,
  DOCUMENT_DELETE = 2,
  DOCUMENT_TRANSFER = 3,
  DOCUMENT_PURCHASE = 4,
  DOCUMENT_UPDATE_PRICE = 5
}

// Token Action Enum (maps directly to WASM token transition type numbers 0-10)
export enum TokenActionEnum {
  TOKEN_BURN = 0,
  TOKEN_MINT = 1,
  TOKEN_TRANSFER = 2,
  TOKEN_FREEZE = 3,
  TOKEN_UNFREEZE = 4,
  TOKEN_DESTROY_FROZEN_FUNDS = 5,
  TOKEN_CLAIM = 6,
  TOKEN_EMERGENCY_ACTION = 7,
  TOKEN_CONFIG_UPDATE = 8,
  TOKEN_DIRECT_PURCHASE = 9,
  TOKEN_SET_PRICE_FOR_DIRECT_PURCHASE = 10
}

// Combined type for batch actions
export type BatchActionType = DocumentActionEnum | TokenActionEnum

// Batch Actions Info with metadata
export const BatchActions = {
  // Documents
  DOCUMENT_CREATE: {
    title: 'Document Create',
    description: 'Creates a new document on the Dash Platform. This action stores the document within the data contract, adhering to the defined schema.',
    colorScheme: 'green'
  },
  DOCUMENT_REPLACE: {
    title: 'Document Replace',
    description: 'Replaces an existing document with a new version. The document is overwritten while maintaining its unique identifier.',
    colorScheme: 'orange'
  },
  DOCUMENT_DELETE: {
    title: 'Document Delete',
    description: 'Deletes an existing document from the Dash Platform. This action removes the document but keeps a traceable record of its deletion.',
    colorScheme: 'red'
  },
  DOCUMENT_TRANSFER: {
    title: 'Document Transfer',
    description: 'Transfers ownership or access rights of a document to another identity. This action facilitates secure exchange of document control.',
    colorScheme: 'orange'
  },
  DOCUMENT_UPDATE_PRICE: {
    title: 'Document Update Price',
    description: 'Sets or updates the price of a document. Turns the document into NFT that could be transferred or sold to other Identity in the system.',
    colorScheme: 'blue'
  },
  DOCUMENT_PURCHASE: {
    title: 'Document Purchase',
    description: 'Purchases a document from the Identity in the Dash Platform. Seller receive credits on the balance of his Identity and ownership is transferred to the buyer.',
    colorScheme: 'green'
  },
  // Tokens
  TOKEN_BURN: {
    title: 'Token Burn',
    description: 'Permanently removes tokens from circulation by destroying them.',
    colorScheme: 'red'
  },
  TOKEN_MINT: {
    title: 'Token Mint',
    description: 'Creates new tokens and issues them to a specified identity.',
    colorScheme: 'emerald'
  },
  TOKEN_TRANSFER: {
    title: 'Token Transfer',
    description: 'Transfers tokens from one identity to another.',
    colorScheme: 'orange'
  },
  TOKEN_FREEZE: {
    title: 'Token Freeze',
    description: 'Temporarily freezes tokens, preventing their transfer or use.',
    colorScheme: 'blue'
  },
  TOKEN_UNFREEZE: {
    title: 'Token Unfreeze',
    description: 'Unfreezes previously frozen tokens, allowing their use again.',
    colorScheme: 'orange'
  },
  TOKEN_DESTROY_FROZEN_FUNDS: {
    title: 'Destroy Frozen Funds',
    description: 'Permanently destroys frozen tokens.',
    colorScheme: 'orange'
  },
  TOKEN_CLAIM: {
    title: 'Token Claim',
    description: 'Claims tokens that have been allocated or made available.',
    colorScheme: 'green'
  },
  TOKEN_EMERGENCY_ACTION: {
    title: 'Emergency Action',
    description: 'Emergency administrative action on tokens.',
    colorScheme: 'red'
  },
  TOKEN_CONFIG_UPDATE: {
    title: 'Config Update',
    description: 'Updates token configuration or parameters.',
    colorScheme: 'gray'
  },
  TOKEN_DIRECT_PURCHASE: {
    title: 'Direct Purchase',
    description: 'Direct purchase of tokens using credits.',
    colorScheme: 'green'
  },
  TOKEN_SET_PRICE_FOR_DIRECT_PURCHASE: {
    title: 'Set Purchase Price',
    description: 'Sets or updates the direct purchase price for tokens.',
    colorScheme: 'blue'
  }
}

export type BatchActionCode = keyof typeof BatchActions
