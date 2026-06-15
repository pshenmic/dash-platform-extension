// Standalone check: does our asset lock TX have its credit output at the
// address that DIP-13 registration-funding key derives from this seed?
//
// If credit output PKH == derived PKH at m/9'/coin'/5'/1'/N → Android SPV
// bloom filter SHOULD pick it up (PKH is in IdentityFundingKeyChain).
//
// Usage:
//   node scripts/check-asset-lock.mjs

import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types.js'
import { DashCoreSDK, Transaction, Output } from 'dash-core-sdk'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const MNEMONIC = 'wasp antenna garage uniform flavor forward skin illegal olive sense call town'
const NETWORK = 'testnet' // 'mainnet' | 'testnet'
const ASSET_LOCK_TXID = '91585aa6378a698e5a3cc9c523519c80161ef4c31174f9c0a3992c9a9003b81a'
const MAX_INDEX = 30 // gap limit for registration funding key scan
// ─────────────────────────────────────────────────────────────────────────────

const platformSDK = new DashPlatformSDK({ network: NETWORK })
const coreSDK = new DashCoreSDK({ network: NETWORK })

function bytesToHex (bytes) {
  return Array.prototype.map.call(bytes, (x) => ('00' + x.toString(16)).slice(-2)).join('')
}

function deriveRegistrationKey (walletHDKey, identityIndex) {
  const coinType = NETWORK === 'mainnet' ? 5 : 1
  const path = `m/9'/${coinType}'/5'/1'/${identityIndex}`
  return platformSDK.keyPair.derivePath(walletHDKey, path)
}

async function main () {
  console.log(`Asset lock TX: ${ASSET_LOCK_TXID}`)
  console.log(`Network: ${NETWORK}`)
  console.log('')

  // ── 1. Fetch the asset lock TX from L1 ──────────────────────────────────
  let dapiTx
  try {
    dapiTx = await coreSDK.getTransaction(ASSET_LOCK_TXID)
  } catch (e) {
    console.log(`FAIL: could not fetch asset lock TX from DAPI: ${e.message ?? e}`)
    process.exit(1)
  }

  console.log(`L1 status:`)
  console.log(`  confirmations:   ${dapiTx.confirmations}`)
  console.log(`  isInstantLocked: ${dapiTx.isInstantLocked}`)
  console.log(`  isChainLocked:   ${dapiTx.isChainLocked}`)
  console.log(`  height:          ${dapiTx.height}`)
  console.log('')

  if (dapiTx.confirmations === 0 && !dapiTx.isInstantLocked && !dapiTx.isChainLocked) {
    console.log('WARN: TX not confirmed/locked — Android SPV cannot see it yet')
  }

  // ── 2. Parse the asset lock TX and pull its credit output ────────────────
  const tx = Transaction.fromBytes(Uint8Array.from(dapiTx.transaction))
  console.log(`TX type:               ${tx.getExtraPayloadType()}`)
  console.log(`TX hash (re-computed): ${tx.hash()}`)
  console.log(`TX hash (from DAPI):   ${ASSET_LOCK_TXID}`)
  console.log(`hash match:            ${tx.hash() === ASSET_LOCK_TXID}`)
  console.log('')

  const assetLockPayload = tx.extraPayload
  if (assetLockPayload == null || assetLockPayload.outputs == null) {
    console.log('FAIL: TX has no AssetLockTx extra payload — not an asset lock TX')
    process.exit(1)
  }

  if (assetLockPayload.outputs.length === 0) {
    console.log('FAIL: AssetLockTx payload has no credit outputs')
    process.exit(1)
  }

  console.log(`Credit outputs in extra payload: ${assetLockPayload.outputs.length}`)
  for (let i = 0; i < assetLockPayload.outputs.length; i++) {
    const out = assetLockPayload.outputs[i]
    const addr = out.getAddress != null ? out.getAddress(NETWORK) : '(no getAddress)'
    console.log(`  [${i}] amount=${out.satoshis} addr=${addr} script=${out.script.hex()}`)
  }
  console.log('')

  const creditOutputAddr = assetLockPayload.outputs[0].getAddress != null
    ? assetLockPayload.outputs[0].getAddress(NETWORK)
    : null
  const creditOutputScriptHex = assetLockPayload.outputs[0].script.hex()

  // ── 3. Derive registration-funding key at each index and compare ─────────
  console.log(`Scanning m/9'/${NETWORK === 'mainnet' ? 5 : 1}'/5'/1'/N for N=0..${MAX_INDEX}`)
  console.log('')

  const seed = platformSDK.keyPair.mnemonicToSeed(MNEMONIC.trim())
  const walletHDKey = platformSDK.keyPair.seedToHdKey(seed, NETWORK)

  for (let identityIndex = 0; identityIndex <= MAX_INDEX; identityIndex++) {
    const hdKey = await deriveRegistrationKey(walletHDKey, identityIndex)
    if (hdKey?.privateKey == null) {
      continue
    }

    const key = PrivateKeyWASM.fromBytes(hdKey.privateKey, NETWORK)
    const pubKeyBytes = key.getPublicKey().bytes()
    const addr = platformSDK.keyPair.p2pkhAddress(pubKeyBytes, NETWORK)
    const expectedScriptHex = Output.createP2PKH(0n, addr).script.hex()

    const match = expectedScriptHex === creditOutputScriptHex
    console.log(`[${identityIndex}] addr=${addr}${match ? '  ✓ MATCH' : ''}`)

    if (match) {
      console.log('')
      console.log(`SUCCESS: credit output corresponds to registration key at identityIndex=${identityIndex}`)
      console.log('→ Android wallet SPV bloom filter should match this asset lock TX')
      console.log('→ If Android still doesn\'t show it: SPV scan not at this height yet, or wallet UI requires DashPay profile')
      return
    }
  }

  console.log('')
  console.log(`FAIL: credit output address ${creditOutputAddr ?? '(unknown)'} does NOT match any registration key 0..${MAX_INDEX}`)
  console.log('→ Android SPV will NOT recognize this asset lock TX')
  console.log('→ Possible causes:')
  console.log('   - Wrong derivation path used at registration time')
  console.log('   - Different mnemonic')
  console.log('   - Wrong network in this script')
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
