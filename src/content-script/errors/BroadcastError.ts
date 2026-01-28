export class BroadcastError extends Error {
  signedHex: string

  constructor (message: string, signedHex: string) {
    super(message)
    this.name = 'BroadcastError'
    this.signedHex = signedHex
  }
}
