import { PrivateAPIClient } from '../../src/types/PrivateAPIClient'
import { MessagingMethods } from '../../src/types/enums/MessagingMethods'

// The old one-shot method survives as a shim over the funding journal, so callers
// written against it keep working while the legacy backend path is gone. What
// matters is that it quotes and confirms the same operation, and answers in the
// shape it always did.
describe('topUpIdentityFromAddress compatibility shim', () => {
  let client: PrivateAPIClient
  let calls: Array<{ method: string, payload: any }>

  beforeEach(() => {
    client = new PrivateAPIClient()
    calls = []

    jest.spyOn(client as any, '_rpcCall').mockImplementation(async (method: string, payload: any) => {
      calls.push({ method, payload })

      if (method === MessagingMethods.GET_STATUS) {
        return { network: 'testnet', currentWalletId: 'wallet1', passwordSet: true, ready: true, hasAnyWallet: true }
      }
      if (method === MessagingMethods.PREPARE_IDENTITY_FUNDING) {
        return { id: payload.operationId, feeCredits: '900', fromAddress: 'tdash1source' }
      }

      return {
        id: payload.operationId,
        amountCredits: '3000000000',
        feeCredits: '900',
        fromAddress: 'tdash1source',
        stateTransitionHash: 'topup-hash',
        status: 'completed'
      }
    })
  })

  it('quotes and confirms one operation, and answers in the old shape', async () => {
    const result = await client.topUpIdentityFromAddress('HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR', '3000000000', 'password', 'tdash1source')

    expect(calls.map(call => call.method)).toEqual([
      MessagingMethods.GET_STATUS,
      MessagingMethods.PREPARE_IDENTITY_FUNDING,
      MessagingMethods.TOP_UP_IDENTITY_FROM_PLATFORM_ADDRESS
    ])

    const [, quote, confirm] = calls

    expect(quote.payload).toMatchObject({
      walletId: 'wallet1',
      network: 'testnet',
      source: 'platform',
      kind: 'topUp',
      amountCredits: '3000000000',
      identityId: 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR',
      fromAddress: 'tdash1source'
    })
    // The same operation is confirmed, and the password is not stored anywhere in
    // between: both calls carry it themselves.
    expect(confirm.payload.operationId).toBe(quote.payload.operationId)
    expect(confirm.payload.password).toBe('password')

    expect(result).toEqual({
      stHash: 'topup-hash',
      amountCredits: '3000000000',
      feeCredits: '900',
      fromAddress: 'tdash1source',
      identityId: 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
    })
  })

  it('lets the backend choose the address when none is given', async () => {
    await client.topUpIdentityFromAddress('HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR', '3000000000', 'password')

    expect(calls[1].payload.fromAddress).toBeUndefined()
  })

  it('refuses when no wallet is chosen', async () => {
    jest.spyOn(client as any, '_rpcCall').mockResolvedValue({ network: 'testnet', currentWalletId: null })

    await expect(client.topUpIdentityFromAddress('HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR', '3000000000', 'password'))
      .rejects.toThrow('No wallet is chosen')
  })
})
