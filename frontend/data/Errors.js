export class ServerError extends Error {
    constructor(msg) {
        super(msg);
    }
}

export class AuthenticationError extends Error {
    constructor(msg) {
        super(msg);
    }
}
