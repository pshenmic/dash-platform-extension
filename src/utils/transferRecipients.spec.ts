import { checkRecipients } from './transferRecipients'

describe('checkRecipients', () => {
  it('sums valid amounts and accepts a full list', () => {
    const result = checkRecipients([{ id: '1', address: 'a', amount: '1' }, { id: '2', address: 'b', amount: '0.5' }], 8, 547n)

    expect(result.total).toBe(150000000n)
    expect(result.isValid).toBe(true)
  })

  it('reports a missing address, a missing amount and a too small amount', () => {
    const result = checkRecipients([
      { id: '1', address: '', amount: '1' },
      { id: '2', address: 'b', amount: '' },
      { id: '3', address: 'c', amount: '0.000001' }
    ], 8, 547n)

    expect(result.errors).toEqual({
      1: 'Enter a recipient address.',
      2: 'Enter an amount.',
      3: 'Minimum amount is 0.00000547 Dash.'
    })
    expect(result.isValid).toBe(false)
  })

  it('is invalid without recipients', () => {
    expect(checkRecipients([], 8, 547n).isValid).toBe(false)
  })

  it('reports a duplicate address', () => {
    const result = checkRecipients([{ id: '1', address: 'a', amount: '1' }, { id: '2', address: 'a', amount: '1' }], 8, 547n)
    expect(result.errors).toEqual({ 1: 'This address is already a recipient.', 2: 'This address is already a recipient.' })
  })
})
