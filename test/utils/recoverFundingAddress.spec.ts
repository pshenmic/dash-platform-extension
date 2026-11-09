import { buildFundingAddressRecovery } from '../../src/utils/recoverFundingAddress'
import type { FundingAddressRecovery } from '../../src/utils/recoverFundingAddress'
import { estimateCoreFee } from '../../src/utils/coreTransfer'
import type { CoreWalletUtxo } from '../../src/content-script/services/CoreExplorerService'

// Real testnet keypairs, so signing runs for real rather than against a stub.
// The funding address must be the one this WIF controls: the builder derives each
// input's locking script from the address its output pays to.
const FUNDING_WIF = 'cMpMxK92W1DjqDvWV3pMn4xLwAuQJhNF3MFqkEHUQRPQofUJku8R'
const FUNDING_ADDRESS = 'ybFR23ZZjWb5UFke4RtDPoEVgCtNukW5zu'
const FUNDING_PUBKEY = '02989c0b76cb563971fdc9bef31ec06c3560f3249d6ee9e5d83c57625596e05f6f'
// A different key entirely, for the mismatch case below.
const OTHER_WIF = 'cMtGKxHc7o1RF6RdRtXUnCmUCyjFxc6fwHN3BGza8ite6PjEaEJn'
const OTHER_PUBKEY = '0256b328b30c8bf5839e24058747879408bdb36241dc9c2e7c619faa12b2920967'
const RECIPIENT = 'yLQmwB9hninHD8Ceh2UAqLFWCzirppNLik'

const utxo = (amount: bigint, vout = 0): CoreWalletUtxo => ({
  txid: `${vout}`.padStart(64, '0'),
  vout,
  amount,
  address: FUNDING_ADDRESS
})

const sweep = (utxos: CoreWalletUtxo[], wif: string = FUNDING_WIF): FundingAddressRecovery =>
  buildFundingAddressRecovery(utxos, RECIPIENT, FUNDING_ADDRESS, wif, 'testnet')

// A P2PKH scriptSig is <signature> <public key>, so the key it was signed with is
// the last 33 bytes.
const signedWith = (scriptSigHex: string): string => scriptSigHex.slice(-66)

describe('buildFundingAddressRecovery', () => {
  it('drains every output into a single recipient output', () => {
    const utxos = [utxo(100_000n), utxo(50_000n, 1)]
    const fee = estimateCoreFee(2, 1)

    const recovery = sweep(utxos)

    expect(recovery.inputs).toHaveLength(2)
    expect(recovery.amountDuffs).toBe(150_000n - fee)
    expect(recovery.feeDuffs).toBe(fee)
    expect(recovery.transaction.inputs).toHaveLength(2)
    expect(recovery.transaction.outputs).toHaveLength(1)
    expect(recovery.transaction.outputs[0].satoshis).toBe(150_000n - fee)
  })

  it('signs every input with the funding key', () => {
    const recovery = sweep([utxo(100_000n), utxo(50_000n, 1)])

    for (const input of recovery.transaction.inputs) {
      expect(signedWith(input.scriptSig.hex())).toBe(FUNDING_PUBKEY)
    }
  })

  it('takes the fee out of the deposit, so inputs equal outputs plus fee', () => {
    const amount = 100_000n
    const fee = estimateCoreFee(1, 1)

    const recovery = sweep([utxo(amount)])

    expect(recovery.amountDuffs).toBe(amount - fee)
    expect(recovery.feeDuffs).toBe(fee)
    expect(recovery.amountDuffs + recovery.feeDuffs).toBe(amount)
    expect(recovery.txid).toMatch(/^[0-9a-f]{64}$/)
  })

  it('refuses a deposit too small to pay its own fee', () => {
    const fee = estimateCoreFee(1, 1)

    expect(() => sweep([utxo(fee)])).toThrow(/does not cover/)
    expect(() => sweep([utxo(fee - 1n)])).toThrow(/does not cover/)
  })

  it('refuses an address with nothing to spend', () => {
    expect(() => sweep([])).toThrow(/no unspent outputs/)
  })

  it('rejects a destination the network cannot decode', () => {
    expect(() => buildFundingAddressRecovery(
      [utxo(100_000n)],
      'not-an-address',
      FUNDING_ADDRESS,
      FUNDING_WIF,
      'testnet'
    )).toThrow()
  })

  // dash-core-sdk's sign() never checks the key against the input's locking
  // script, so a wrong key produces a transaction that serializes cleanly and is
  // only rejected by a node. This pins that behaviour: it is why
  // RecoverAssetLockFundsHandler verifies the decrypted key derives the address it
  // is stored against before broadcasting, rather than trusting the build.
  it('signs with whatever key it is given, without checking it can spend the address', () => {
    const recovery = sweep([utxo(100_000n)], OTHER_WIF)

    expect(signedWith(recovery.transaction.inputs[0].scriptSig.hex())).toBe(OTHER_PUBKEY)
    expect(signedWith(recovery.transaction.inputs[0].scriptSig.hex())).not.toBe(FUNDING_PUBKEY)
  })
})
