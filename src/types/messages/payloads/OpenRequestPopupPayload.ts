// The website's own pending request to show: its connection request, which it
// has one of, or one of its payment requests by id.
export type OpenRequestPopupPayload =
  | { kind: 'connect' }
  | { kind: 'payment', id: string }
