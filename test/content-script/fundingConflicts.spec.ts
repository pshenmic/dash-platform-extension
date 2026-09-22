import { canConflictWithFunding, findConflictingFunding } from '../../src/content-script/api/fundingConflicts'
import { MessagingMethods } from '../../src/types/enums/MessagingMethods'

const operation = (kind: string, status: string = 'proving'): any =>
  ({ id: kind, walletId: 'w1', network: 'testnet', source: 'core', kind, status })

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

  it('does not read the journal for requests that cannot conflict', () => {
    for (const method of [MessagingMethods.TOP_UP_IDENTITY, MessagingMethods.SEND_PLATFORM_TRANSFER, MessagingMethods.GET_CORE_BALANCE]) {
      expect(canConflictWithFunding(method)).toBe(false)
      expect(findConflictingFunding(method, [operation('registration')])).toBeUndefined()
    }
  })
})
