import { DashCoreSDK, Transaction, TransactionType, Output, Script, ExtraPayload, PrivateKey } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { waitForAssetLockProof } from '../../src/utils/waitForAssetLockProof'

describe('asset lock proof fallback', () => {
  const address = PrivateKey.fromBytes(new Uint8Array(32).fill(1), 'testnet').getAddress()
  const tx = new Transaction([], [new Output(1000n, Script.fromASM('OP_RETURN OP_0'))], 0, 3, TransactionType.TRANSACTION_ASSET_LOCK, new ExtraPayload.AssetLockTx(1, 1, [Output.createP2PKH(1000n, address)]))
  const subscription = { async * [Symbol.asyncIterator] () {} }

  test('continues chain-lock polling after the InstantLock stream closes', async () => {
    const core = { getTransaction: jest.fn(async () => ({ isChainLocked: true, height: 100 })) } as unknown as DashCoreSDK
    const sdk = { node: { status: jest.fn(async () => ({ chain: { coreChainLockedHeight: 100 } })) } } as unknown as DashPlatformSDK
    await expect(waitForAssetLockProof(core, sdk, tx, tx.hash(), subscription, 1, 100)).resolves.toEqual({ type: 'chainLock', txid: tx.hash(), coreChainLockedHeight: 100, outputIndex: 0 })
  })

  test('does not use a Core chain lock until Platform has reached the required height', async () => {
    const core = { getTransaction: jest.fn(async () => ({ isChainLocked: true, height: 100 })) } as unknown as DashCoreSDK
    const status = jest.fn().mockResolvedValueOnce({ chain: { coreChainLockedHeight: 99 } }).mockResolvedValue({ chain: { coreChainLockedHeight: 100 } })
    const sdk = { node: { status } } as unknown as DashPlatformSDK
    await waitForAssetLockProof(core, sdk, tx, tx.hash(), subscription, 1, 100)
    expect(status).toHaveBeenCalledTimes(2)
  })

  test('times out even if the InstantLock stream never emits or closes', async () => {
    const core = { getTransaction: jest.fn(async () => ({ isChainLocked: false })) } as unknown as DashCoreSDK
    const stream = { [Symbol.asyncIterator]: () => ({ next: async () => await new Promise<IteratorResult<any>>(() => {}) }) }
    const sdk = {} as unknown as DashPlatformSDK
    await expect(waitForAssetLockProof(core, sdk, tx, tx.hash(), stream, 1, 10)).rejects.toThrow('Timed out')
    const calls = (core.getTransaction as jest.Mock).mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 15))
    expect(core.getTransaction).toHaveBeenCalledTimes(calls)
  })
})
