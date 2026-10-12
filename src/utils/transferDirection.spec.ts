import { canShieldToOthers, isShieldToMyself } from './transferDirection'
import type { TransferDraft } from '../ui/states/sendTransaction/types'

const draft = (from: TransferDraft['from']['type'], to: TransferDraft['to']['type'], shieldToMyself = true): TransferDraft => ({
  from: { type: from, identityId: null },
  to: { type: to, recipient: '', shieldToMyself },
  asset: { type: 'dash' },
  amount: '',
  isAdvanced: false,
  recipients: [],
  changeAddress: null
})

describe('shield target', () => {
  it('lets only a Core sender shield to a typed address', () => {
    expect(canShieldToOthers(draft('core', 'shielded'))).toBe(true)
    expect(canShieldToOthers(draft('platformAddress', 'shielded'))).toBe(false)
    expect(canShieldToOthers(draft('core', 'identity'))).toBe(false)
  })

  it('treats the own pool as the target unless a Core sender unchecks it', () => {
    expect(isShieldToMyself(draft('platformAddress', 'shielded', false))).toBe(true)
    expect(isShieldToMyself(draft('core', 'shielded', true))).toBe(true)
    expect(isShieldToMyself(draft('core', 'shielded', false))).toBe(false)
    expect(isShieldToMyself(draft('shielded', 'shielded'))).toBe(false)
    expect(isShieldToMyself(draft('core', 'identity'))).toBe(false)
  })
})
