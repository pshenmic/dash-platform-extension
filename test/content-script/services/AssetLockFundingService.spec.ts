import { Input, Output, Script, Transaction } from 'dash-core-sdk'
import { AssetLockFundingService } from '../../../src/content-script/services/AssetLockFundingService'
import { bytesToHex } from '../../../src/utils'

// A real signed shape, so the code that reads a kept payment's inputs has
// something it can actually parse.
const conflictable = (): { hex: string, txid: string } => {
  const transaction = new Transaction(
    [new Input(`${'a'.repeat(63)}1`, 3, Script.fromASM('OP_0'), 0xffffffff)],
    [Output.createP2PKH(100_000n, 'yYaCeiBLVeiDvR3ryAcTtifeRckEpbipBk')]
  )

  return { hex: bytesToHex(transaction.bytes()), txid: transaction.hash() }
}

const FUNDING_ADDRESS = 'yFundingAddress'
const XPUB = 'tpubAccountXpub'

describe('AssetLockFundingService', () => {
  const wallet: any = { walletId: 'wallet1', type: 'seedphrase', network: 'testnet' }

  let coreExplorer: any
  let coreSpend: any
  let assetLockFundingAddressesRepository: any
  let service: AssetLockFundingService

  const PREPARED_HEX = 'deadbeef'

  const prepared = {
    txid: 'b'.repeat(64),
    feeDuffs: 226n,
    changeDuffs: 89_774n,
    transaction: { bytes: () => Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) }
  }

  const fund = async (amountDuffs = 100_000n): Promise<any> => await service.fundFromWallet({
    wallet,
    xpub: XPUB,
    fundingAddress: FUNDING_ADDRESS,
    amountDuffs,
    password: 'test',
    assetLockFundingAddressesRepository
  })

  beforeEach(() => {
    jest.clearAllMocks()

    coreExplorer = {
      getAddressUtxos: jest.fn(async () => []),
      hasTransaction: jest.fn(async () => true),
      getOutpointSpender: jest.fn(async () => null)
    }
    coreSpend = {
      prepare: jest.fn(async () => prepared),
      broadcast: jest.fn(async () => {}),
      rebroadcast: jest.fn(async () => {}),
      isBroadcast: jest.fn(async () => true)
    }
    assetLockFundingAddressesRepository = {
      getByAddress: jest.fn(async () => ({ address: FUNDING_ADDRESS, used: false })),
      markAsFunded: jest.fn(async () => {}),
      clearFunding: jest.fn(async () => {})
    }

    service = new AssetLockFundingService(coreExplorer, coreSpend)
  })

  it('pays the funding address out of the wallet and reports the transaction', async () => {
    const result = await fund()

    expect(coreSpend.prepare).toHaveBeenCalledWith({
      wallet, xpub: XPUB, account: 0, outputs: [{ address: FUNDING_ADDRESS, amountDuffs: 100_000n }], password: 'test'
    })
    expect(coreSpend.broadcast).toHaveBeenCalledWith(prepared)
    expect(result).toEqual({ fundingTxid: prepared.txid, paid: true, feeDuffs: 226n, changeDuffs: 89_774n })
  })

  it('writes the payment down before it reaches the network', async () => {
    const order: string[] = []

    assetLockFundingAddressesRepository.markAsFunded.mockImplementation(async () => { order.push('markAsFunded') })
    coreSpend.broadcast.mockImplementation(async () => { order.push('broadcast') })

    await fund()

    // The amount goes down with it, so LIST_PENDING_ASSET_LOCKS can say how much
    // is sitting on the address when the operation stops here.
    expect(assetLockFundingAddressesRepository.markAsFunded).toHaveBeenCalledWith(FUNDING_ADDRESS, prepared.txid, '100000', PREPARED_HEX)
    expect(order).toEqual(['markAsFunded', 'broadcast'])
  })

  // The payment is written down before it is broadcast, so the broadcast is the
  // step that can fail with the record already in place.
  it('pays nothing when the recorded payment is already on its way', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64)
    })

    expect(await fund()).toEqual({ fundingTxid: 'd'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('sends the recorded payment again instead of paying a second time', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64), fundingTxHex: PREPARED_HEX
    })

    expect(await fund()).toEqual({ fundingTxid: 'd'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(coreSpend.rebroadcast).toHaveBeenCalledWith('d'.repeat(64), PREPARED_HEX)
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  // The case the frontend hit: two chains in a row, the second one signing on an
  // output the first had already spent while the explorer still offered it.
  it('says a kept payment can never confirm once another transaction took its input', async () => {
    const { hex, txid } = conflictable()

    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: txid, fundingTxHex: hex
    })
    coreSpend.rebroadcast.mockRejectedValue(new Error('Transaction is rejected: tx-txlock-conflict'))
    coreExplorer.getOutpointSpender.mockResolvedValue('c'.repeat(64))

    await expect(fund()).rejects.toThrow('can never confirm')
    await expect(fund()).rejects.toThrow('c'.repeat(64))

    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('passes a refusal through while nothing has taken an input', async () => {
    const { hex, txid } = conflictable()

    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: txid, fundingTxHex: hex
    })
    coreSpend.rebroadcast.mockRejectedValue(new Error('Transaction is rejected: tx-txlock-conflict'))

    await expect(fund()).rejects.toThrow('tx-txlock-conflict')
  })

  it('does not look up a payment whose deposit an asset lock already spent', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64), assetLockTxid: 'a'.repeat(64)
    })

    expect(await fund()).toEqual({ fundingTxid: 'd'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(coreSpend.isBroadcast).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.clearFunding).not.toHaveBeenCalled()
  })

  // Written down before the bytes were kept: there is nothing to send again.
  // Paying the address a second time is the one thing that must not happen here,
  // because the recorded payment can be in a mempool this node has not seen.
  it('refuses to guess when a payment it cannot re-send is nowhere to be found', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64)
    })
    coreSpend.isBroadcast.mockResolvedValue(false)

    await expect(fund()).rejects.toThrow('cannot be sent again')

    expect(coreSpend.prepare).not.toHaveBeenCalled()
    expect(assetLockFundingAddressesRepository.clearFunding).not.toHaveBeenCalled()
  })

  it('continues on a payment it cannot re-send while a node still has it', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, fundingTxid: 'd'.repeat(64)
    })
    coreSpend.isBroadcast.mockResolvedValue(true)

    expect(await fund()).toEqual({ fundingTxid: 'd'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('picks up a deposit nothing recorded, and records it', async () => {
    coreExplorer.getAddressUtxos.mockResolvedValue([
      { txid: 'e'.repeat(64), vout: 0, amount: 70_000n },
      { txid: 'e'.repeat(64), vout: 1, amount: 30_000n }
    ])

    expect(await fund()).toEqual({ fundingTxid: 'e'.repeat(64), paid: false, feeDuffs: 0n, changeDuffs: 0n })
    expect(assetLockFundingAddressesRepository.markAsFunded).toHaveBeenCalledWith(FUNDING_ADDRESS, 'e'.repeat(64))
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('refuses to choose between deposits from several transactions', async () => {
    coreExplorer.getAddressUtxos.mockResolvedValue([
      { txid: 'e'.repeat(64), vout: 0, amount: 70_000n },
      { txid: 'f'.repeat(64), vout: 0, amount: 30_000n }
    ])

    await expect(fund()).rejects.toThrow('holds deposits from several transactions')
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('refuses an address whose asset lock is already on L1 with no funding transaction recorded', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue({
      address: FUNDING_ADDRESS, used: false, assetLockTxid: 'a'.repeat(64)
    })

    await expect(fund()).rejects.toThrow('already has an asset lock on L1')
    expect(coreSpend.prepare).not.toHaveBeenCalled()
  })

  it('pays an address that has no local entry at all', async () => {
    assetLockFundingAddressesRepository.getByAddress.mockResolvedValue(null)

    expect((await fund()).paid).toBe(true)
    expect(assetLockFundingAddressesRepository.markAsFunded).not.toHaveBeenCalled()
  })
})
