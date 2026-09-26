import { canConflictWithFunding, findConflictingFunding } from '../../src/content-script/api/fundingConflicts'
import { MessagingMethods } from '../../src/types/enums/MessagingMethods'

const operation = (kind: string, status: string = 'proving', source: string = 'core'): any =>
  ({ id: kind, walletId: 'w1', network: 'testnet', source, kind, status })

describe('fundingConflicts', () => {
  it('blocks a legacy registration while a native registration is pending: they share the identity index', () => {
    expect(findConflictingFunding(MessagingMethods.REGISTER_IDENTITY, [operation('registration')])?.kind).toBe('registration')
  })

  it('lets a legacy registration run alongside a pending top-up', () => {
    expect(findConflictingFunding(MessagingMethods.REGISTER_IDENTITY, [operation('topUp')])).toBeUndefined()
  })

  it('ignores finished operations', () => {
    for (const status of ['completed', 'cancelled', 'failed']) {
      expect(findConflictingFunding(MessagingMethods.REGISTER_IDENTITY, [operation('registration', status)])).toBeUndefined()
    }
  })

  // A pending Platform operation has the address nonce signed into its
  // transition, so anything else spending that address would invalidate it.
  it('blocks spends of the Platform address while an operation on it is pending', () => {
    const pending = [operation('registration', 'proving', 'platform')]

    for (const method of [MessagingMethods.SEND_PLATFORM_TRANSFER, MessagingMethods.WITHDRAW_PLATFORM_ADDRESS_TO_CORE, MessagingMethods.SHIELD_TO_POOL]) {
      expect(canConflictWithFunding(method)).toBe(true)
      expect(findConflictingFunding(method, pending)?.source).toBe('platform')
    }
  })

  it('lets Platform spends run while only a Core operation is pending', () => {
    for (const method of [MessagingMethods.SEND_PLATFORM_TRANSFER, MessagingMethods.SHIELD_TO_POOL]) {
      expect(findConflictingFunding(method, [operation('registration')])).toBeUndefined()
    }
  })

  it('does not read the journal for requests that cannot conflict', () => {
    for (const method of [MessagingMethods.TOP_UP_IDENTITY, MessagingMethods.GET_CORE_BALANCE]) {
      expect(canConflictWithFunding(method)).toBe(false)
      expect(findConflictingFunding(method, [operation('registration')])).toBeUndefined()
    }
  })
})
