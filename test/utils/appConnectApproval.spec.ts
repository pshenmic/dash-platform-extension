import { isAppConnectApproval } from '../../src/utils/appConnectApproval'
import { MessagingMethods } from '../../src/types/enums/MessagingMethods'

const approval = {
  type: 'response',
  method: MessagingMethods.CONNECT_APP,
  payload: { status: 'approved' }
} as any

describe('isAppConnectApproval', () => {
  it('accepts an approved answer to CONNECT_APP', () => {
    expect(isAppConnectApproval(approval)).toBe(true)
  })

  it('refuses a message that is not an answer', () => {
    expect(isAppConnectApproval({ ...approval, type: 'request' })).toBe(false)
  })

  // The bug this covers: every answer the extension sends carries
  // `type: 'response'`, so an answer to any other method used to pass.
  it('refuses an answer to another method', () => {
    expect(isAppConnectApproval({ ...approval, method: MessagingMethods.GET_CORE_BALANCE })).toBe(false)
    expect(isAppConnectApproval({ ...approval, method: MessagingMethods.SWITCH_NETWORK })).toBe(false)
  })

  it('refuses a connection that was rejected or is still waiting', () => {
    expect(isAppConnectApproval({ ...approval, payload: { status: 'rejected' } })).toBe(false)
    expect(isAppConnectApproval({ ...approval, payload: { status: 'pending' } })).toBe(false)
  })

  it('refuses a message carrying no payload at all', () => {
    expect(isAppConnectApproval({ type: 'response', method: MessagingMethods.CONNECT_APP } as any)).toBe(false)
    expect(isAppConnectApproval(undefined)).toBe(false)
  })
})
