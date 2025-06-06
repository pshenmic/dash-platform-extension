export class PayloadNotValidError extends Error {
    constructor(reason: string) {
        super(`Request payload is not valid: ${reason}`);
    }
}
