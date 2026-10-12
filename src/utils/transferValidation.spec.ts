import { transferAmountInput, validateTransfer } from './transferValidation'
import type { TransferDraft } from '../ui/states/sendTransaction/types'
import { MIN_FEE_RELAY } from '../constants'

const DASH = { type: 'dash' } as const

const draft = (fields: Partial<TransferDraft> = {}): TransferDraft => ({
  from: { type: 'core', identityId: null },
  to: { type: 'core', recipient: 'yRecipient', shieldToMyself: true },
  asset: DASH,
  amount: '1',
  isAdvanced: false,
  recipients: [],
  changeAddress: null,
  ...fields
})

const CORE_BALANCE = { amount: 500000000n, decimals: 8, unit: 'Dash' }

const validate = (current: TransferDraft, overrides: Partial<Parameters<typeof validateTransfer>[0]> = {}): ReturnType<typeof validateTransfer> => {
  const mode = overrides.mode === undefined ? 'coreSend' : overrides.mode
  return validateTransfer({
    draft: current,
    mode,
    balance: CORE_BALANCE,
    assetKnown: true,
    fee: { amount: 226n, decimals: 8 },
    knownMax: null,
    input: transferAmountInput(current, mode, CORE_BALANCE.decimals),
    senderIdentifier: null,
    shieldedReady: true,
    isResumingFunding: false,
    ...overrides
  })
}

describe('transferAmountInput', () => {
  it('reads the Amount field in Simple and the recipients total in Advanced', () => {
    expect(transferAmountInput(draft(), 'coreSend', 8).amount).toBe(100000000n)

    const advanced = draft({ isAdvanced: true, recipients: [{ id: '1', address: 'a', amount: '1' }, { id: '2', address: 'b', amount: '2' }] })
    expect(transferAmountInput(advanced, 'coreSend', 8).amount).toBe(300000000n)
  })

  it('has no limits without a mode', () => {
    expect(transferAmountInput(draft(), null, 8).limits).toBeNull()
  })
})

describe('validateTransfer', () => {
  it('takes the same-layer fee off the balance for Max', () => {
    expect(validate(draft()).maxAmount).toBe(500000000n - 226n)
    expect(validate(draft(), { fee: { amount: 2700000n, decimals: 11 } }).maxAmount).toBe(500000000n)
    expect(validate(draft(), { knownMax: 42n }).maxAmount).toBe(42n)
  })

  it('lets both steps continue for a complete Simple draft', () => {
    const result = validate(draft())
    expect(result.fromToValid).toBe(true)
    expect(result.amountValid).toBe(true)
    expect(result.amountError).toBeNull()
    expect(result.received).toBeNull()
  })

  it('shows what an asset lock delivers', () => {
    expect(validate(draft({ to: { type: 'identity', recipient: 'id', shieldToMyself: true } }), { mode: 'coreTopUp' }).received).toBe(100000000n - MIN_FEE_RELAY)
  })

  it('rejects the sender as its own recipient', () => {
    const result = validate(draft(), { senderIdentifier: 'yRecipient' })
    expect(result.recipientError).toBe('Recipient must be different from the sender.')
    expect(result.fromToValid).toBe(false)
  })

  it('holds the first step without a mode, a known asset, an identity or an unlocked shielded balance', () => {
    expect(validate(draft(), { mode: null }).fromToValid).toBe(false)
    expect(validate(draft(), { assetKnown: false }).fromToValid).toBe(false)
    expect(validate(draft({ from: { type: 'identity', identityId: null } })).fromToValid).toBe(false)
    expect(validate(draft(), { shieldedReady: false }).fromToValid).toBe(false)
  })

  it('needs a positive amount within the balance unless a paid top up is resumed', () => {
    const over = draft({ amount: '6' })
    expect(validate(over).amountValid).toBe(false)
    expect(validate(over).amountError).toContain('Insufficient balance')
    expect(validate(over, { isResumingFunding: true }).amountValid).toBe(true)
    expect(validate(draft({ amount: '' })).amountValid).toBe(false)
  })

  it('validates Advanced recipients and the change address', () => {
    const recipients = [{ id: '1', address: 'a', amount: '1' }, { id: '2', address: 'b', amount: '2' }]
    expect(validate(draft({ isAdvanced: true, recipients })).fromToValid).toBe(true)
    expect(validate(draft({ isAdvanced: true, recipients, changeAddress: '' })).fromToValid).toBe(false)
    expect(validate(draft({ isAdvanced: true, recipients }), { senderIdentifier: 'b' }).advancedError).toBe('Recipient must be different from the sender.')
    expect(validate(draft({ isAdvanced: true, recipients: [{ id: '1', address: '', amount: '1' }] })).fromToValid).toBe(false)
  })
})
