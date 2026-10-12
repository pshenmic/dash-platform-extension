import { ShieldedService } from '../../../src/content-script/services/ShieldedService'
import { SHIELDED_MEMO_BYTES } from '../../../src/constants'

const service = new ShieldedService({} as any, {} as any)

// The pool's memo field holds 32 bytes. The SDK pads a shorter one itself, but it
// refuses an oversized memo only after the password has been taken and, for a
// spend, after the proof was built — so the size is settled before any of that.
describe('ShieldedService.validateMemo', () => {
  test('accepts an absent memo and one that fits', () => {
    expect(service.validateMemo()).toBeNull()
    expect(service.validateMemo('note')).toBeNull()
    expect(service.validateMemo('x'.repeat(SHIELDED_MEMO_BYTES))).toBeNull()
  })

  test('refuses a non-string and anything too long, in bytes', () => {
    expect(service.validateMemo(1 as any)).toBe('memo must be a string')
    expect(service.validateMemo('x'.repeat(33))).toBe('memo must be at most 32 bytes (got 33)')
    expect(service.validateMemo('я'.repeat(17))).toBe('memo must be at most 32 bytes (got 34)')
  })
})
