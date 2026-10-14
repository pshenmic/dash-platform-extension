// Transaction-related constants

// Minimum credit transfer amount enforced by the protocol (0.001 DASH)
export const MIN_CREDIT_TRANSFER = 100000n

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

// Coins a fallback Core fee pays for; the common send spends 1, and a send-max of a typical wallet stays under 20.
export const CORE_FALLBACK_FEE_INPUTS = 20

// Fallback A->A fee: the flat 15M transfer reserve, over 2x dpp's 6.5M one-output fee.
export const PLATFORM_TRANSFER_FALLBACK_FEE_CREDITS = 15_000_000n

// Fallback withdrawal fee: dpp asks ~400M from an identity or an address, plus a 25% margin.
export const WITHDRAWAL_FALLBACK_FEE_CREDITS = 500_000_000n
