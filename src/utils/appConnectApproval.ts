import { EventData } from '../types'
import { MessagingMethods } from '../types/enums/MessagingMethods'

/**
 * Whether a message on the page is the extension answering CONNECT_APP with an
 * approval - the one moment the SDK bundle should be injected.
 *
 * All three have to hold at once. Checked as three separate "not this, return"
 * guards joined by `and`, a message failing only one of them still passed, and
 * since every answer the extension sends carries `type: 'response'`, the bundle
 * was injected again on almost every message.
 *
 * @param data - message the page received
 */
export const isAppConnectApproval = (data: EventData | undefined): boolean => {
  return data?.type === 'response' &&
    data?.method === MessagingMethods.CONNECT_APP &&
    data?.payload?.status === 'approved'
}
