import { EstimateCoreTransferHandler } from '../../../../src/content-script/api/private/core/estimateCoreTransfer'
import { SendCoreTransactionHandler } from '../../../../src/content-script/api/private/core/sendCoreTransaction'
import { CoreUtxosService } from '../../../../src/content-script/services/CoreUtxosService'
import { CoreSpendService } from '../../../../src/content-script/services/CoreSpendService'
import { CoreAddressChain } from '../../../../src/types/enums/CoreAddressChain'
import { deriveCoreAddressesFromXpub, deriveCoreAddressKeyAtIndex } from '../../../../src/utils/coreAddresses'
import { deriveWalletHdKey } from '../../../../src/utils'
import { PrivateKey } from 'dash-core-sdk'

jest.mock('../../../../src/utils/coreAddresses', () => {
  const actual = jest.requireActual('../../../../src/utils/coreAddresses')
  return {
    ...actual,
    deriveCoreAddressesFromXpub: jest.fn(),
    deriveCoreAddressKeyAtIndex: jest.fn()
  }
})

jest.mock('../../../../src/utils', () => {
  const actual = jest.requireActual('../../../../src/utils')
  return {
    ...actual,
    deriveWalletHdKey: jest.fn()
  }
})

const deriveCoreAddressesFromXpubMock = deriveCoreAddressesFromXpub as jest.MockedFunction<typeof deriveCoreAddressesFromXpub>
const deriveCoreAddressKeyAtIndexMock = deriveCoreAddressKeyAtIndex as jest.MockedFunction<typeof deriveCoreAddressKeyAtIndex>
const deriveWalletHdKeyMock = deriveWalletHdKey as jest.MockedFunction<typeof deriveWalletHdKey>

// Valid testnet addresses, so the real address decoding runs.
const RECEIVING = ['yWjF8BxE6xr3hew5FUVNBdZhQLcLQq7Tej', 'yWjGKfvcPT5nPTkqFX7H2EQ764Hp5PrCff']
const CHANGE = ['yVMvvEvrZVRvBcyvG4w8VLbbko3EuPcQLA', 'yVMx7iuEqyfesRogG7Z3KwS1SWiibPVUfh']
const DESTINATION = 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY'
const DESTINATION_2 = 'ygJiJkn55HhGgY9CXiovyxE3BCoJw7JfQa'

const TXID = 'a'.repeat(64)

const utxo = (address: string, amount: bigint, vout = 0): any => ({ txid: TXID, vout, amount, address })

describe('core payment estimate and multi-output send', () => {
  const password = 'test'

  let walletRepository: any
  let corePendingSpendsRepository: any
  let coreExplorer: any
  let coreSDK: any
  let estimate: EstimateCoreTransferHandler
  let send: SendCoreTransactionHandler

  const event = (payload: any): any => ({ payload })

  beforeEach(() => {
    jest.clearAllMocks()

    walletRepository = {
      getCurrent: jest.fn(async () => ({
        walletId: 'wallet1', type: 'seedphrase', network: 'testnet', currentIdentity: null
      })),
      getCoreAccountXpub: jest.fn(async () => 'tpubAccountXpub')
    }
    corePendingSpendsRepository = {
      getAll: jest.fn(async () => []),
      record: jest.fn(async () => {}),
      remove: jest.fn(async () => {})
    }
    coreExplorer = {
      getXpubSummary: jest.fn(async () => ({ nextUnused: { receiving: 1, change: 1 } })),
      getAddressesUtxos: jest.fn(async () => [utxo(RECEIVING[0], 100_000n), utxo(RECEIVING[1], 50_000n, 1)])
    }

    deriveCoreAddressesFromXpubMock.mockImplementation((_sdk, _xpub, _network, _account, chain, count, start = 0) => {
      const isReceiving = chain === CoreAddressChain.receiving
      const pool = isReceiving ? RECEIVING : CHANGE

      return Array.from({ length: count }, (_, offset) => ({
        address: pool[start + offset],
        derivationPath: `m/44'/1'/0'/${isReceiving ? 0 : 1}/${start + offset}`,
        index: start + offset,
        chain
      }))
    })
    deriveCoreAddressKeyAtIndexMock.mockImplementation(async (_hdKey, _network, _account, chain, index) => {
      const privateKey: any = PrivateKey.fromBytes(new Uint8Array(32).fill(7), 'testnet')
      privateKey.getAddress = (): string => (chain === CoreAddressChain.receiving ? RECEIVING : CHANGE)[index]

      return privateKey
    })
    deriveWalletHdKeyMock.mockReturnValue('walletHdKey' as any)

    const sdk: any = {}
    coreSDK = { broadcastTransaction: jest.fn(async () => ({ transactionId: 'broadcasted' })) }

    const coreUtxos = new CoreUtxosService(sdk, coreExplorer, corePendingSpendsRepository)
    const coreSpend = new CoreSpendService(sdk, coreSDK, coreUtxos, corePendingSpendsRepository)

    estimate = new EstimateCoreTransferHandler(walletRepository, coreSpend)
    send = new SendCoreTransactionHandler(walletRepository, corePendingSpendsRepository, coreSpend)
  })

  describe('EstimateCoreTransferHandler', () => {
    it('prices a payment without signing or sending anything', async () => {
      const result = await estimate.handle(event({ outputs: [{ address: DESTINATION, amountDuffs: '10000' }] }))

      // One input covers it: 1 input, 2 outputs = 226 duffs.
      expect(result).toEqual({
        amountDuffs: '10000',
        feeDuffs: '226',
        assetLockFeeDuffs: '0',
        totalCostDuffs: '10226',
        changeDuffs: (100_000n - 10_000n - 226n).toString(),
        changeAddress: CHANGE[1],
        inputs: [{ txid: TXID, vout: 0, address: RECEIVING[0], amount: '100000' }],
        totalInDuffs: '100000',
        maxSendableDuffs: (150_000n - 340n).toString()
      })
      expect(coreSDK.broadcastTransaction).not.toHaveBeenCalled()
      expect(deriveWalletHdKeyMock).not.toHaveBeenCalled()
    })

    it('prices the asset lock a Core to Platform operation pays on top', async () => {
      const result = await estimate.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }], type: 'assetLock'
      }))

      expect(result.assetLockFeeDuffs).toBe('1000')
      expect(result.totalCostDuffs).toBe('11226')
    })

    it('prices paying out everything the wallet holds', async () => {
      const result = await estimate.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '1' }], sendMax: true
      }))

      // Both inputs, one output: 10 + 148 * 2 + 34 = 340 duffs.
      expect(result.amountDuffs).toBe((150_000n - 340n).toString())
      expect(result.changeDuffs).toBe('0')
      expect(result.inputs).toHaveLength(2)
    })

    it('prices a payment out of the outputs the caller picked', async () => {
      const result = await estimate.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }],
        inputs: [{ txid: TXID, vout: 1 }]
      }))

      expect(result.inputs).toEqual([{ txid: TXID, vout: 1, address: RECEIVING[1], amount: '50000' }])
      expect(result.maxSendableDuffs).toBe((50_000n - 192n).toString())
    })

    it('refuses an output the wallet cannot spend', async () => {
      await expect(estimate.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }],
        inputs: [{ txid: 'f'.repeat(64), vout: 3 }]
      }))).rejects.toThrow('is not among this wallet')
    })

    it('refuses a change address that is not the wallet own', async () => {
      await expect(estimate.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }],
        changeAddress: DESTINATION
      }))).rejects.toThrow("not one of this wallet's own addresses")
    })

    it('refuses a recipient from another network', async () => {
      await expect(estimate.handle(event({
        outputs: [{ address: 'XanAvE5GMB8CsPH78B9moJq9viEVKvCS4f', amountDuffs: '10000' }]
      }))).rejects.toThrow('Invalid recipient Core address for testnet')
    })

    it('says what is wrong with a payload before running', () => {
      expect(estimate.validatePayload({ outputs: [] } as any)).toMatch(/non-empty/)
      expect(estimate.validatePayload({ outputs: [{ address: DESTINATION, amountDuffs: '100' }] })).toMatch(/greater than 546/)
      expect(estimate.validatePayload({ outputs: [{ address: DESTINATION, amountDuffs: '1' }], sendMax: true })).toBeNull()
      expect(estimate.validatePayload({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }, { address: DESTINATION_2, amountDuffs: '10000' }],
        sendMax: true
      })).toMatch(/exactly one output/)
    })
  })

  describe('SendCoreTransactionHandler', () => {
    it('pays several recipients in one transaction', async () => {
      const response = await send.handle(event({
        outputs: [
          { address: DESTINATION, amountDuffs: '10000' },
          { address: DESTINATION_2, amountDuffs: '20000' }
        ],
        password
      }))

      // 1 input, 3 outputs = 10 + 148 + 102 = 260 duffs.
      expect(coreSDK.broadcastTransaction).toHaveBeenCalledTimes(1)
      expect(response).toEqual({
        txid: expect.stringMatching(/^[0-9a-f]{64}$/),
        amountDuffs: '30000',
        feeDuffs: '260',
        changeDuffs: (100_000n - 30_000n - 260n).toString(),
        changeAddress: CHANGE[1],
        outputs: [
          { address: DESTINATION, amountDuffs: '10000' },
          { address: DESTINATION_2, amountDuffs: '20000' }
        ],
        fromAddresses: [RECEIVING[0]]
      })
    })

    it('pays out everything the picked outputs hold', async () => {
      const response = await send.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '1' }],
        inputs: [{ txid: TXID, vout: 1 }],
        sendMax: true,
        password
      }))

      expect(response.amountDuffs).toBe((50_000n - 192n).toString())
      expect(response.changeDuffs).toBe('0')
      expect(response.changeAddress).toBeNull()
      expect(response.fromAddresses).toEqual([RECEIVING[1]])
    })

    it('sends the change to the address it was told to', async () => {
      const response = await send.handle(event({
        outputs: [{ address: DESTINATION, amountDuffs: '10000' }],
        changeAddress: CHANGE[0],
        password
      }))

      expect(response.changeAddress).toBe(CHANGE[0])
      expect(corePendingSpendsRepository.record).toHaveBeenCalledWith(expect.objectContaining({
        change: expect.objectContaining({ address: CHANGE[0] })
      }))
    })

    it('needs a password', () => {
      expect(send.validatePayload({ outputs: [{ address: DESTINATION, amountDuffs: '10000' }], password: '' })).toMatch(/Password/)
    })
  })
})
