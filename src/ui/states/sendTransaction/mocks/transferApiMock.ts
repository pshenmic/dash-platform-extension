import { TRANSFER_FEE_CREDITS } from '../../../../constants'
import type { AddressAmount } from '../types'

// Dev toggle: reject the given password.
export const transferMockSettings: { rejectedPassword: string } = {
  rejectedPassword: 'wrong'
}

const HEX = '0123456789abcdef'

const randomHash = (): string => Array.from({ length: 64 }, () => HEX[Math.floor(Math.random() * HEX.length)]).join('')

const delay = async (minMs: number, maxMs: number): Promise<void> =>
  await new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)))

const assertPassword = (password: string): void => {
  if (password === '' || password === transferMockSettings.rejectedPassword) {
    throw new Error('Invalid password')
  }
}

// MOCK: Advanced Address -> Address: several outputs.
export const sendPlatformTransfer = async (params: {
  inputs: AddressAmount[]
  outputs: AddressAmount[]
}, password: string): Promise<{ stHash: string, feeCredits: string }> => {
  await delay(800, 1500)
  assertPassword(password)
  return { stHash: randomHash(), feeCredits: TRANSFER_FEE_CREDITS.toString() }
}
