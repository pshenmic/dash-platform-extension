export class IdentityAlreadyExistsError extends Error {
  constructor (identifier: string) {
    super(`Identity with identifier ${identifier} already exists`)
  }
}
