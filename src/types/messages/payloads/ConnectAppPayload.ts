export interface ConnectAppPayload {
  url: string
  // Asked again while waiting for the user's answer, rather than to start
  // asking: a rejection is then reported instead of replaced by a new request.
  waiting?: boolean
}
