/** Throw from a route handler to return a JSON error with the given status. */
export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly extra: Record<string, unknown> = {},
        readonly headers: Record<string, string> = {},
    ) {
        super(message);
        this.name = "HttpError";
    }
}

export const unauthorizedError = () => new HttpError(401, "Unauthorized");
export const forbiddenError = (message = "Forbidden") => new HttpError(403, message);
export const notFoundError = (message = "Not found") => new HttpError(404, message);
export const conflictError = (message: string) => new HttpError(409, message);
