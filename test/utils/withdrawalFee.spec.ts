import { CoreScriptWASM } from 'pshenmic-dpp'
import { addressWithdrawalFeeCredits, identityWithdrawalFeeCredits, maxWithdrawalCredits } from '../../src/utils/withdrawalFee'
import { MAX_WITHDRAWAL_CREDITS, TRANSFER_FEE_CREDITS } from '../../src/constants'

const IDENTITY_ID = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec'
const script = (): CoreScriptWASM => CoreScriptWASM.newP2PKH(new Uint8Array(20).fill(7))

describe('withdrawal fees', () => {
  describe('addressWithdrawalFeeCredits', () => {
    it('prices one input with no change', () => {
      expect(addressWithdrawalFeeCredits()).toBe(400_500_000n)
    })

    it('charges for a change output and for every extra input', () => {
      expect(addressWithdrawalFeeCredits(1, true)).toBeGreaterThan(addressWithdrawalFeeCredits(1, false))
      expect(addressWithdrawalFeeCredits(2, false)).toBeGreaterThan(addressWithdrawalFeeCredits(1, false))
    })

    it('costs far more than the flat reserve a transfer uses', () => {
      expect(addressWithdrawalFeeCredits()).toBeGreaterThan(TRANSFER_FEE_CREDITS * 10n)
    })
  })

  describe('identityWithdrawalFeeCredits', () => {
    it('prices a withdrawal from an identity balance', () => {
      expect(identityWithdrawalFeeCredits(IDENTITY_ID, 100_000_000n, script())).toBe(400_000_000n)
    })

    it('does not depend on the amount, the recipient script or the nonce', () => {
      const base = identityWithdrawalFeeCredits(IDENTITY_ID, 100_000_000n, script())

      expect(identityWithdrawalFeeCredits(IDENTITY_ID, 10_000_000_000n, script())).toBe(base)
      expect(identityWithdrawalFeeCredits(IDENTITY_ID, 100_000_000n, CoreScriptWASM.newP2SH(new Uint8Array(20).fill(9)))).toBe(base)
      expect(identityWithdrawalFeeCredits(IDENTITY_ID, 100_000_000n, script(), 9999n)).toBe(base)
      expect(identityWithdrawalFeeCredits(IDENTITY_ID, 100_000_000n)).toBe(base)
    })
  })

  describe('maxWithdrawalCredits', () => {
    it('is the balance less the fee', () => {
      expect(maxWithdrawalCredits(1_000_000_000n, 400_000_000n)).toBe(600_000_000n)
    })

    it('is zero when the balance cannot cover the fee', () => {
      expect(maxWithdrawalCredits(400_000_000n, 400_000_000n)).toBe(0n)
      expect(maxWithdrawalCredits(1n, 400_000_000n)).toBe(0n)
    })

    it('never exceeds what Platform accepts in one withdrawal', () => {
      expect(maxWithdrawalCredits(MAX_WITHDRAWAL_CREDITS * 3n, 400_000_000n)).toBe(MAX_WITHDRAWAL_CREDITS)
    })
  })
})
