export class SigningError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'SigningError'
  }
}
