export class PayloadNotValidError extends Error {
    constructor() {
        super(`Request payload is not valid`);
    }
}
