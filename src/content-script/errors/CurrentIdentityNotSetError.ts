export class CurrentIdentityNotSetError extends Error {
    constructor() {
        super(`Current identity not set`);
    }
}
