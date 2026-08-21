// Transaction-related constants

// Minimum credit transfer amount enforced by the protocol (0.001 DASH)
export const MIN_CREDIT_TRANSFER = 100000n

// Credit withdrawal limits enforced by the protocol
export const MIN_CREDIT_WITHDRAWAL = 190000n
export const MAX_CREDIT_WITHDRAWAL = 50000000000000n

// Estimated fees by network and asset type
export const ESTIMATED_FEES = {
  testnet: {
    credits: 2700000n,
    tokens: 100000000n
  },
  mainnet: {
    credits: 3300000n,
    tokens: 110000000n
  }
} as const

export type NetworkType = keyof typeof ESTIMATED_FEES
export type AssetType = keyof typeof ESTIMATED_FEES.testnet
