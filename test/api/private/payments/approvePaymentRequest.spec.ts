import hash from 'hash.js'
import { encrypt, PrivateKey } from 'eciesjs'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import { PaymentRequestsRepository } from '../../../../src/content-script/repository/PaymentRequestsRepository'
import { ApprovePaymentRequestHandler } from '../../../../src/content-script/api/private/payments/approvePaymentRequest'
import { RejectPaymentRequestHandler } from '../../../../src/content-script/api/private/payments/rejectPaymentRequest'
import { PaymentRouter } from '../../../../src/content-script/api/private/payments/PaymentRouter'
import { PaymentNotSentError } from '../../../../src/content-script/errors/PaymentNotSentError'
import { PaymentRequest } from '../../../../src/types/PaymentRequest'
import { PaymentRequestStatus } from '../../../../src/types/enums/PaymentRequestStatus'
import { PAYMENT_REQUEST_TTL_MS } from '../../../../src/constants'
import { bytesToHex, utf8ToBytes } from '../../../../src/utils'
import { installWebLocks } from '../../../helpers/webLocks'

const PASSWORD = 'test'
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TXID = 'b'.repeat(64)

describe('APPROVE_PAYMENT_REQUEST', () => {
  let uninstallWebLocks: () => void
  let repository: PaymentRequestsRepository
  let walletRepository: any
  let current: any
  let route: any
  let handler: ApprovePaymentRequestHandler
  let id: string
  let sequence = 0

  const wallet = {
    walletId: 'abcdef',
    type: 'seedphrase',
    network: 'testnet',
    label: null,
    encryptedMnemonic: bytesToHex(encrypt(PrivateKey.fromHex(hash.sha256().update(PASSWORD).digest('hex')).publicKey.toHex(), utf8ToBytes(MNEMONIC))),
    seedHash: null,
    currentIdentity: null
  }

  const approve = async (payload: object = {}): Promise<any> =>
    await handler.handle({ payload: { id, source: 'core', confirmedFeeDuffs: '226', password: PASSWORD, ...payload } } as any)

  const stored = async (): Promise<PaymentRequest> => await repository.getById(id) as PaymentRequest

  const seed = async (overrides: Partial<PaymentRequest> = {}): Promise<void> => {
    await repository.create({
      id,
      origin: 'https://shop.example',
      network: 'testnet',
      walletId: 'abcdef',
      address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY',
      addressType: 'core',
      amountDuffs: '10000000',
      status: PaymentRequestStatus.pending,
      createdAt: Date.now(),
      source: null,
      feeDuffs: null,
      transactions: [],
      result: null,
      error: null,
      ...overrides
    })
  }

  beforeAll(() => {
    uninstallWebLocks = installWebLocks()
  })

  afterAll(() => {
    uninstallWebLocks()
  })

  beforeEach(async () => {
    // The memory adapter shares one store across the file: a fresh id per case.
    sequence += 1
    id = `request${sequence}`

    repository = new PaymentRequestsRepository(new MemoryStorageAdapter())
    current = wallet

    const scoped = { getCurrent: jest.fn(async () => wallet), getCoreAccountXpub: jest.fn(async () => 'tpub') }
    walletRepository = { getCurrent: jest.fn(async () => current), forScope: jest.fn(() => scoped) }

    route = {
      source: 'core',
      recipient: 'core',
      quote: jest.fn(),
      prepare: jest.fn(async () => ({ feeDuffs: 226n, transactions: [{ type: 'core', txid: TXID, hex: '0100' }] })),
      send: jest.fn(async () => ({ delivery: 'sent', transactions: [{ type: 'core', txid: TXID }] }))
    }

    handler = new ApprovePaymentRequestHandler(repository, walletRepository, new PaymentRouter([route]))

    await seed()
  })

  it('pays the request, writing its transactions down before sending them', async () => {
    route.send.mockImplementation(async () => {
      const atSend = await stored()

      expect(atSend.status).toBe(PaymentRequestStatus.processing)
      expect(atSend.transactions).toEqual([{ type: 'core', txid: TXID, hex: '0100' }])

      return { delivery: 'sent', transactions: [{ type: 'core', txid: TXID }] }
    })

    const { request } = await approve()

    expect(route.prepare).toHaveBeenCalledWith(expect.objectContaining({ id }), expect.objectContaining({ wallet }), PASSWORD)
    expect(request.status).toBe(PaymentRequestStatus.completed)
    expect(request.result).toEqual({
      id,
      address: 'yVUKAMNURsDaGB4GFZgJUmYBoBJTW32stY',
      amountDuffs: '10000000',
      delivery: 'sent',
      transactions: [{ type: 'core', txid: TXID }]
    })
    expect(await stored()).toEqual(request)
  })

  it('pays from the wallet the request was made against, through its own scope', async () => {
    await approve()

    expect(walletRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'abcdef' })
  })

  it('answers a repeated confirmation with the result instead of paying again', async () => {
    const first = await approve()
    const second = await approve({ password: undefined })

    expect(second.request).toEqual(first.request)
    expect(route.prepare).toHaveBeenCalledTimes(1)
    expect(route.send).toHaveBeenCalledTimes(1)
  })

  it('refuses a second confirmation while the first one runs', async () => {
    let release: () => void = () => {}
    route.prepare.mockImplementation(async () => {
      await new Promise<void>(resolve => { release = resolve })

      return { feeDuffs: 226n, transactions: [{ type: 'core', txid: TXID, hex: '0100' }] }
    })

    const first = approve()

    await new Promise(resolve => setImmediate(resolve))
    await expect(approve()).rejects.toThrow(`Payment request ${id} is already being processed`)

    release()

    expect((await first).request.status).toBe(PaymentRequestStatus.completed)
    expect(route.prepare).toHaveBeenCalledTimes(1)
  })

  it('does not pay a request the website cancelled', async () => {
    await repository.setCancellation(id, { reason: 'closed', cancelledAt: Date.now() })

    await expect(approve()).rejects.toThrow('the confirmation window was closed')

    expect(route.prepare).not.toHaveBeenCalled()
    expect((await stored()).status).toBe(PaymentRequestStatus.rejected)
  })

  it('stops before signing when the website cancels just as the user confirms', async () => {
    const save = repository.save.bind(repository)

    // The cancellation lands right after the confirmation is written - the
    // website saw the request still pending.
    jest.spyOn(repository, 'save').mockImplementationOnce(async (request) => {
      await save(request)
      await repository.setCancellation(id, { reason: 'closed', cancelledAt: Date.now() })
    })

    await expect(approve()).rejects.toThrow('the confirmation window was closed')

    expect(route.prepare).not.toHaveBeenCalled()
    expect((await stored()).status).toBe(PaymentRequestStatus.rejected)
  })

  it('drops a request once the wallet it was made against is no longer current', async () => {
    current = { ...wallet, walletId: 'fedcba' }

    await expect(approve()).rejects.toThrow('because the wallet or network changed')

    expect(route.prepare).not.toHaveBeenCalled()
    expect((await stored()).status).toBe(PaymentRequestStatus.rejected)
  })

  it('drops a request once the network changed', async () => {
    current = { ...wallet, network: 'mainnet' }

    await expect(approve()).rejects.toThrow('because the wallet or network changed')

    expect((await stored()).status).toBe(PaymentRequestStatus.rejected)
  })

  it('drops a request the user left waiting too long', async () => {
    await repository.save({ ...await stored(), createdAt: Date.now() - PAYMENT_REQUEST_TTL_MS - 1 })

    await expect(approve()).rejects.toThrow('expired')

    expect(route.prepare).not.toHaveBeenCalled()
    expect((await stored()).status).toBe(PaymentRequestStatus.rejected)
  })

  it('refuses a wrong or missing password and leaves the request to the user', async () => {
    await expect(approve({ password: 'wrong' })).rejects.toThrow('Invalid password')
    await expect(approve({ password: undefined })).rejects.toThrow('Password is required')

    expect(route.prepare).not.toHaveBeenCalled()
    expect((await stored()).status).toBe(PaymentRequestStatus.pending)
  })

  it('refuses a source that cannot pay the recipient and leaves the request to the user', async () => {
    await expect(approve({ source: 'platform' })).rejects.toThrow('Paying a Core address from Platform funds is not supported yet')

    expect((await stored()).status).toBe(PaymentRequestStatus.pending)
  })

  it('sends the request back to the user when the fee rose since it was shown', async () => {
    route.prepare.mockResolvedValueOnce({ feeDuffs: 500n, transactions: [{ type: 'core', txid: TXID, hex: '0100' }] })

    await expect(approve()).rejects.toThrow('The fee is now 500 duffs, more than the 226 duffs confirmed')

    const sentBack = await stored()

    expect(route.send).not.toHaveBeenCalled()
    expect(sentBack.status).toBe(PaymentRequestStatus.pending)
    expect(sentBack.transactions).toEqual([])
    expect(sentBack.error).toMatch('The fee is now 500 duffs')

    // Confirmed again at the new fee, it is paid.
    route.prepare.mockResolvedValueOnce({ feeDuffs: 500n, transactions: [{ type: 'core', txid: TXID, hex: '0100' }] })

    expect((await approve({ confirmedFeeDuffs: '500' })).request.status).toBe(PaymentRequestStatus.completed)
  })

  it('sends the request back to the user when signing fails', async () => {
    route.prepare.mockRejectedValueOnce(new Error('Insufficient funds'))

    await expect(approve()).rejects.toThrow('Insufficient funds')

    expect(route.send).not.toHaveBeenCalled()
    expect(await stored()).toMatchObject({ status: PaymentRequestStatus.pending, source: null, error: 'Insufficient funds' })
  })

  it('keeps a payment whose send failed and finishes it without the password', async () => {
    route.send.mockRejectedValueOnce(new Error('No node answered'))

    await expect(approve()).rejects.toThrow('No node answered')

    expect(await stored()).toMatchObject({
      status: PaymentRequestStatus.processing,
      transactions: [{ type: 'core', txid: TXID, hex: '0100' }],
      error: 'No node answered'
    })

    const { request } = await approve({ password: undefined })

    expect(request.status).toBe(PaymentRequestStatus.completed)
    expect(route.prepare).toHaveBeenCalledTimes(1)
    expect(route.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ transactions: [{ type: 'core', txid: TXID, hex: '0100' }] }),
      expect.anything()
    )
  })

  it('finishes a signed payment only on the wallet and network it was signed for', async () => {
    route.send.mockRejectedValueOnce(new Error('No node answered'))
    await expect(approve()).rejects.toThrow('No node answered')

    current = { ...wallet, network: 'mainnet' }

    await expect(approve({ password: undefined })).rejects.toThrow('switch back to them to finish it')

    expect(route.send).toHaveBeenCalledTimes(1)
    expect((await stored()).status).toBe(PaymentRequestStatus.processing)
  })

  it('fails a payment that can never reach the network, for good', async () => {
    route.send.mockRejectedValueOnce(new PaymentNotSentError('Inputs already spent. Nothing was paid'))

    await expect(approve()).rejects.toThrow('Nothing was paid')

    expect((await stored()).status).toBe(PaymentRequestStatus.failed)
    await expect(approve()).rejects.toThrow('Nothing was paid')
    expect(route.prepare).toHaveBeenCalledTimes(1)
  })

  it('confirms anew an attempt that died before it signed anything', async () => {
    await repository.save({ ...await stored(), status: PaymentRequestStatus.processing, source: 'core' })

    expect((await approve()).request.status).toBe(PaymentRequestStatus.completed)
  })

  it('validates what the confirmation names', () => {
    const valid = { id, source: 'core', confirmedFeeDuffs: '226', password: PASSWORD }

    expect(handler.validatePayload(valid as any)).toBeNull()
    expect(handler.validatePayload({ ...valid, password: undefined } as any)).toBeNull()
    expect(handler.validatePayload({ ...valid, source: 'identity' } as any)).toMatch('source must be one of')
    expect(handler.validatePayload({ ...valid, confirmedFeeDuffs: 226 } as any)).toMatch('confirmedFeeDuffs')
    expect(handler.validatePayload({ ...valid, id: '' } as any)).toMatch('id must be')
  })

  describe('REJECT_PAYMENT_REQUEST', () => {
    let reject: RejectPaymentRequestHandler

    beforeEach(() => {
      reject = new RejectPaymentRequestHandler(repository)
    })

    it('rejects a request the user has not confirmed', async () => {
      const { request } = await reject.handle({ payload: { id } } as any)

      expect(request.status).toBe(PaymentRequestStatus.rejected)
      expect(request.error).toBe('Payment was rejected by the user')
      await expect(approve()).rejects.toThrow('Payment was rejected by the user')
    })

    it('cannot take back a payment that is signed', async () => {
      route.send.mockRejectedValueOnce(new Error('No node answered'))
      await expect(approve()).rejects.toThrow('No node answered')

      await expect(reject.handle({ payload: { id } } as any)).rejects.toThrow('is processing and can no longer be rejected')
    })

    it('cannot slip in while a confirmation runs', async () => {
      let release: () => void = () => {}
      route.prepare.mockImplementation(async () => {
        await new Promise<void>(resolve => { release = resolve })

        return { feeDuffs: 226n, transactions: [{ type: 'core', txid: TXID, hex: '0100' }] }
      })

      const confirmation = approve()

      await new Promise(resolve => setImmediate(resolve))
      await expect(reject.handle({ payload: { id } } as any)).rejects.toThrow('is already being processed')

      release()

      expect((await confirmation).request.status).toBe(PaymentRequestStatus.completed)
    })
  })
})
