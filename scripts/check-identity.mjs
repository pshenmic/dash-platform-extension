// Standalone check for whether an identity is findable via Platform by its
// auth key #0 PKH (the same path Android uses for getByPublicKeyHash recovery).
//
// Usage:
//   cd /home/lexx/workspace/development/dash-platform-extension
//   node scripts/check-identity.mjs

import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types.js'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const MNEMONIC = 'wasp antenna garage uniform flavor forward skin illegal olive sense call town'
const NETWORK = 'testnet' // 'mainnet' | 'testnet'
const EXPECTED_IDENTIFIER = '6ER49GpyDZdtsucP6QwxrXxtofJB9cUtWm5tjG4zd22a'
const MAX_INDEX = 30 // scan identityIndex 0..MAX_INDEX (DIP-13 gap limit)
// ─────────────────────────────────────────────────────────────────────────────

const sdk = new DashPlatformSDK({ network: NETWORK })

async function main () {
  const seed = sdk.keyPair.mnemonicToSeed(MNEMONIC.trim())
  const walletHDKey = sdk.keyPair.seedToHdKey(seed, NETWORK)

  console.log(`Scanning identityIndex 0..${MAX_INDEX} on ${NETWORK}`)
  console.log(`Looking for identity: ${EXPECTED_IDENTIFIER}`)
  console.log('')

  for (let identityIndex = 0; identityIndex <= MAX_INDEX; identityIndex++) {
    const { privateKey } = sdk.keyPair.deriveIdentityPrivateKey(walletHDKey, identityIndex, 0, NETWORK)
    if (privateKey == null) {
      console.log(`[${identityIndex}] no privateKey derived`)
      continue
    }

    const authKey0 = PrivateKeyWASM.fromBytes(privateKey, NETWORK)
    const pkh = authKey0.getPublicKeyHash()
    const address = sdk.keyPair.p2pkhAddress(authKey0.getPublicKey().bytes(), NETWORK)

    // Try both unique and non-unique lookups (same as our register handler does)
    const unique = await sdk.identities.getIdentityByPublicKeyHash(pkh).catch(() => null)
    const nonUnique = unique == null
      ? await sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh).catch(() => null)
      : null
    const found = unique ?? nonUnique
    const foundId = found?.id?.base58() ?? null

    const match = foundId === EXPECTED_IDENTIFIER ? '  ✓ MATCH' : ''
    console.log(`[${identityIndex}] pkh=${pkh} addr=${address} → ${foundId ?? '(not found)'}${match}`)

    if (foundId === EXPECTED_IDENTIFIER) {
      console.log('')
      console.log(`SUCCESS: identity ${EXPECTED_IDENTIFIER} is findable via Platform at identityIndex=${identityIndex}`)
      console.log('Source:', unique != null ? 'getIdentityByPublicKeyHash (unique)' : 'getIdentityByNonUniquePublicKeyHash')
      return
    }
  }

  console.log('')
  console.log(`FAIL: identity ${EXPECTED_IDENTIFIER} NOT found at any identityIndex 0..${MAX_INDEX}`)
  console.log('')
  console.log('Possible reasons:')
  console.log('  1. identityIndex > MAX_INDEX — bump MAX_INDEX in the script')
  console.log('  2. Wrong network (currently ' + NETWORK + ')')
  console.log('  3. Wrong mnemonic')
  console.log('  4. Identity was not actually registered on Platform')
  console.log('  5. Platform did not index it by auth key #0 PKH — Android recovery would also fail')
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
