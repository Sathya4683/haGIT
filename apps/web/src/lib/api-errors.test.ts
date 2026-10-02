import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./api-errors";

describe("apiErrorMessage", () => {
    it("gives rate-limited requests a retry time", () => {
        expect(apiErrorMessage({ response: { status: 429, data: { retryAfter: 17 } } }, "Fallback"))
            .toBe("Too many requests. Try again in 17 seconds.");
    });

    it("uses Retry-After header when the body has no retry duration", () => {
        expect(apiErrorMessage({ response: { status: 429, headers: { "retry-after": "8" } } }, "Fallback"))
            .toBe("Too many requests. Try again in 8 seconds.");
    });

    it("preserves API error messages and normal fallbacks", () => {
        expect(apiErrorMessage({ response: { status: 400, data: { error: "Invalid input" } } }, "Fallback"))
            .toBe("Invalid input");
        expect(apiErrorMessage(new Error("network"), "Fallback")).toBe("Fallback");
    });
});
