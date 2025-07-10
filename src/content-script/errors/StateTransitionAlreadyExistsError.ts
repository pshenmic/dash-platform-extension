export class StateTransitionAlreadyExistsError extends Error {
  constructor (reason: string) {
    super('State Transition already exists')
  }
}
