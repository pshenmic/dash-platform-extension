import { PrivateKey, Transaction, TransactionType, Output, Script, utils } from 'dash-core-sdk'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { buildAssetLockFromUtxos, selectAssetLockUtxos } from '../../src/utils/buildAssetLockFromUtxos'
import { CoreUtxo } from '../../src/types/CoreUtxo'
import { CoreAddressChain } from '../../src/types/enums/CoreAddressChain'

describe.each(['mainnet', 'testnet'] as const)('native asset locks on %s', network => {
  const keys = [1, 2, 3].map(value => PrivateKey.fromBytes(Uint8Array.from({ length: 32 }, (_, i) => i === 31 ? value : 0), network))
  const creditAddress = keys[2].getAddress()
  const changeAddress = keys[1].getAddress()
  const utxo = (key: number, amount: number, vout = 0): CoreUtxo => ({
    txid: (key + 1).toString(16).padStart(64, '0'),
    vout,
    amount: String(amount),
    address: keys[key].getAddress(),
    chain: key === 0 ? CoreAddressChain.receiving : CoreAddressChain.change,
    index: 0,
    derivationPath: `m/44'/${network === 'mainnet' ? 5 : 1}'/0'/${key}/0`
  })

  test('selects enough coins, returns native change, and preserves the credit owner', () => {
    const plan = selectAssetLockUtxos([utxo(0, 200000), utxo(0, 100000, 1)], 50000n, creditAddress, changeAddress)
    expect(plan.inputs).toHaveLength(1)
    const tx = buildAssetLockFromUtxos(plan, [keys[0]])
    expect(tx.type).toBe(TransactionType.TRANSACTION_ASSET_LOCK)
    expect(tx.outputs[0].satoshis).toBe(50000n)
    expect(tx.outputs[1].getAddress(network)).toBe(changeAddress)
    expect(BigInt(plan.feeDuffs)).toBeGreaterThanOrEqual(BigInt(tx.bytes().length))
    expect(BigInt(plan.feeDuffs) + tx.getOutputAmount()).toBe(200000n)
    expect(Transaction.fromHex(tx.hex()).hex()).toBe(tx.hex())
    expect(tx.extraPayload?.bytes()).toEqual(new Uint8Array([1, 1, ...Output.createP2PKH(50000n, creditAddress).bytes()]))
  })

  test('independently verifies every signature when spending receiving and change addresses', () => {
    const plan = selectAssetLockUtxos([utxo(0, 40000), utxo(1, 40000)], 70000n, creditAddress, changeAddress)
    expect(plan.inputs).toHaveLength(2)
    const signingKeys = plan.inputs.map(input => keys.find(key => key.getAddress() === input.address) as PrivateKey)
    const tx = buildAssetLockFromUtxos(plan, signingKeys)
    tx.inputs.forEach((input, index) => {
      const chunks = input.scriptSig.parsedScriptChunks
      const signature = new Uint8Array(chunks[0].data as ArrayBuffer)
      const publicKey = new Uint8Array(chunks[1].data as ArrayBuffer)
      expect(publicKey).toEqual(signingKeys[index].getPublicKey().bytes())
      const signable = Transaction.fromHex(tx.hex())
      signable.inputs.forEach((other, i) => { other.scriptSig = i === index ? Output.createP2PKH(0n, plan.inputs[i].address).script : new Script() })
      const bytes = new Uint8Array([...signable.bytes(), 1, 0, 0, 0])
      expect(secp256k1.verify(signature.slice(0, -1), utils.doubleSHA256(bytes), publicKey, { prehash: false, format: 'der', lowS: true })).toBe(true)
    })
    expect(buildAssetLockFromUtxos(JSON.parse(JSON.stringify(plan)), signingKeys).hash()).toBe(tx.hash())
  })

  test('selects several outputs of one address when necessary', () => {
    const plan = selectAssetLockUtxos([utxo(0, 40000, 0), utxo(0, 40000, 1)], 70000n, creditAddress, changeAddress)
    expect(buildAssetLockFromUtxos(plan, [keys[0], keys[0]]).inputs).toHaveLength(2)
  })

  test('handles exact spend and dust without a change output', () => {
    const feeWithChange = BigInt(selectAssetLockUtxos([utxo(0, 100000)], 50000n, creditAddress, changeAddress).feeDuffs)
    const feeWithoutChange = feeWithChange - BigInt(Output.createP2PKH(1n, changeAddress).bytes().length)
    for (const dust of [0n, 100n, 545n]) {
      const plan = selectAssetLockUtxos([utxo(0, Number(50000n + feeWithoutChange + dust))], 50000n, creditAddress, changeAddress)
      expect(plan.changeDuffs).toBe('0')
      expect(BigInt(plan.feeDuffs)).toBe(feeWithoutChange + dust)
      expect(buildAssetLockFromUtxos(plan, [keys[0]]).outputs).toHaveLength(1)
    }
  })

  test('excludes reserved outpoints and rejects insufficient, malformed or duplicate inputs', () => {
    const input = utxo(0, 100000)
    expect(() => selectAssetLockUtxos([input], 50000n, creditAddress, changeAddress, new Set([`${input.txid}:0`]))).toThrow('Insufficient')
    expect(() => selectAssetLockUtxos([input], 100000n, creditAddress, changeAddress)).toThrow('Insufficient')
    expect(() => selectAssetLockUtxos([input, input], 50000n, creditAddress, changeAddress)).toThrow('Duplicate')
    expect(() => selectAssetLockUtxos([{ ...input, vout: -1 }], 50000n, creditAddress, changeAddress)).toThrow('Invalid')
    expect(() => selectAssetLockUtxos([{ ...input, txid: 'bad' }], 50000n, creditAddress, changeAddress)).toThrow('Invalid')
    const plan = selectAssetLockUtxos([input], 50000n, creditAddress, changeAddress)
    expect(() => buildAssetLockFromUtxos(plan, [keys[1]])).toThrow('does not belong')
    expect(() => buildAssetLockFromUtxos({ ...plan, changeDuffs: '1' }, [keys[0]])).toThrow('do not balance')
  })

  test('charges a larger fee for more inputs and scales the relay rate', () => {
    const one = selectAssetLockUtxos([utxo(0, 100000)], 70000n, creditAddress, changeAddress)
    const two = selectAssetLockUtxos([utxo(0, 40000), utxo(1, 40000)], 70000n, creditAddress, changeAddress)
    expect(BigInt(two.feeDuffs)).toBe(BigInt(one.feeDuffs) + 149n)
    expect(BigInt(selectAssetLockUtxos([utxo(0, 100000)], 70000n, creditAddress, changeAddress, new Set(), 2n).feeDuffs)).toBe(BigInt(one.feeDuffs) * 2n)
  })
})
